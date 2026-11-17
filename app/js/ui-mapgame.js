// Gra na mapie: przeciągnij nazwę kraju na jego miejsce. Tryb nauki: stuknij kraj, żeby zobaczyć nazwę.

import { loadMap, country, REGION_STYLE, regionName } from './data.js';
import { P, save, addXP, recordAnswer, recordMap, checkBadges, noteStreak } from './store.js';
import { go } from './nav.js';
import { MapView } from './svgmap.js';
import { norm } from './match.js';
import { sfx, confetti, floatText, toast, modal, announceBadges, announceLevel } from './fx.js';
import { $, esc, flagUrl, fmtTime, fmtNum, collator, plural } from './util.js';
const MAX_TRIES = 3;
const BASE = [10, 5, 3];   // punkty za kraj: 1., 2. i 3. próba
const mapMult = (streak) => (streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1);
const multLabel = (m) => `×${String(m).replace('.', ',')}`;
let G = null;
let token = 0;

export async function enter(el, { cont, mode = 'play', resume = false }) {
  const my = ++token;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Ładowanie mapy…</div>';
  let map;
  try {
    map = await loadMap(cont);
  } catch (e) {
    el.innerHTML = `<div class="loading">Nie udało się wczytać mapy. <button class="btn primary" data-act="back">Wróć</button></div>`;
    el.onclick = () => go('maps');
    return;
  }
  if (my !== token) return;

  const codes = map.items.filter((i) => i.t).map((i) => i.c);
  G = {
    cont, mode, map, el, codes,
    placed: new Set(), revealed: new Set(), attempts: {}, hinted: new Set(),
    mistakes: 0, score: 0, streak: 0, bestStreak: 0,
    elapsed: 0, tRun: null, selected: null, done: false, filter: '', drag: null, info: null,
  };
  const sv = P.mapSaves[cont];
  if (mode === 'play' && resume && sv) {
    G.placed = new Set(sv.placed.filter((c) => codes.includes(c)));
    G.revealed = new Set(sv.revealed || []);
    G.attempts = sv.attempts || {};
    G.hinted = new Set(sv.hinted || []);
    Object.assign(G, { mistakes: sv.mistakes || 0, score: sv.score || 0, streak: sv.streak || 0,
      bestStreak: sv.bestStreak || 0, elapsed: sv.elapsed || 0 });
  } else if (mode === 'play' && sv) {
    delete P.mapSaves[cont];
    save();
  }
  render();
}

export function leave() {
  token++;
  if (!G) return;
  stopTimer();
  if (G.mode === 'play' && !G.done) persist();
  endDrag(true);
  G.mv && G.mv.destroy();
  window.removeEventListener('pointermove', onWinMove);
  window.removeEventListener('pointerup', onWinUp);
  window.removeEventListener('pointercancel', onWinCancel);
  document.removeEventListener('visibilitychange', onVis);
  G = null;
}

// ------------------------------------------------------------ widok

function render() {
  const { el, cont, mode } = G;
  const st = REGION_STYLE[cont];
  const play = mode === 'play';
  el.innerHTML = `
  <div class="mg ${mode}" style="--c1:${st.color};--c2:${st.color2}">
    <header class="mgbar">
      <button class="iconbtn" data-act="back" aria-label="Wróć">‹</button>
      <div class="mg-title"><span class="mg-emoji">${st.emoji}</span>
        <div><h1>${esc(regionName(cont))}</h1><small>${play ? 'Przeciągnij nazwę kraju na mapę' : 'Tryb nauki: stuknij kraj na mapie albo na liście'}</small></div>
      </div>
      ${play ? `
      <div class="mg-stats">
        <span class="pill" title="Ułożone kraje">📍 <b class="mg-prog"></b></span>
        <span class="pill" title="Czas">⏱️ <b class="mg-time">0:00</b></span>
        <span class="pill" title="Punkty">⭐ <b class="mg-score">0</b></span>
        <span class="pill streak" title="Seria">🔥 <b class="mg-streak">0</b><em class="mult"></em></span>
      </div>
      <button class="btn ghost small hint-btn" data-act="hint">💡 Podpowiedź</button>` : ''}
    </header>
    <div class="mg-body">
      <div class="mg-map">
        <div class="mv-host"></div>
        <div class="zoom-ctl">
          <button data-act="zin" aria-label="Przybliż">+</button>
          <button data-act="zout" aria-label="Oddal">−</button>
          <button data-act="zfit" aria-label="Cała mapa">⤢</button>
        </div>
        <div class="sel-banner hidden"></div>
        <div class="info-card hidden"></div>
      </div>
      <aside class="tray">
        <div class="tray-head">
          <input class="tray-search" type="search" placeholder="Szukaj kraju…" autocomplete="off" autocorrect="off" spellcheck="false">
          <span class="tray-count"></span>
        </div>
        <div class="chips"></div>
        <div class="tray-done hidden"></div>
      </aside>
    </div>
  </div>`;

  G.mv = new MapView($('.mv-host', el), G.map, {
    labelFor: (c) => country(c).short,
    onTap: onMapTap,
    labelBoost: !play,
  });
  for (const c of G.placed) {
    G.mv.setClass(c, 'placed');
    if (G.revealed.has(c)) G.mv.setClass(c, 'revealed');
    G.mv.showLabel(c);
  }
  if (!play) {
    for (const c of G.codes) {
      G.mv.setClass(c, 'placed');
      G.mv.showLabel(c);
    }
  }

  el.onclick = onClick;
  const search = $('.tray-search', el);
  search.oninput = () => {
    G.filter = search.value;
    renderChips();
  };
  const chips = $('.chips', el);
  chips.addEventListener('pointerdown', onChipDown);
  chips.addEventListener('touchmove', (e) => { if (G && G.drag && G.drag.active) e.preventDefault(); }, { passive: false });
  chips.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointermove', onWinMove);
  window.addEventListener('pointerup', onWinUp);
  window.addEventListener('pointercancel', onWinCancel);
  document.addEventListener('visibilitychange', onVis);

  renderChips();
  updateStats();
  if (play) {
    startTimer();
    if (!P.settings.mapHelpSeen) showHelp();
  }
}

function sortedRemaining() {
  const list = G.codes.filter((c) => G.mode !== 'play' || !G.placed.has(c)).map(country);
  list.sort((a, b) => collator.compare(a.name, b.name));
  const f = norm(G.filter);
  return f ? list.filter((c) => norm(c.name).includes(f) || c.aliases.some((a) => norm(a).includes(f))) : list;
}

function dots(code) {
  const a = G.attempts[code] || 0;
  if (!a || G.mode !== 'play') return '';
  return `<i class="tries">${Array.from({ length: MAX_TRIES }, (_, i) => `<b class="${i < a ? 'x' : ''}"></b>`).join('')}</i>`;
}

function chipHTML(c) {
  return `<button class="chip ${G.selected === c.code ? 'sel' : ''}" data-c="${c.code}">
    <img src="${flagUrl(c.code)}" alt="" draggable="false"><span>${esc(c.name)}</span>${dots(c.code)}</button>`;
}

function renderChips() {
  const list = sortedRemaining();
  const chips = $('.chips', G.el);
  chips.innerHTML = list.length ? list.map(chipHTML).join('')
    : `<p class="chips-empty">${G.filter ? 'Nic nie pasuje do wyszukiwania' : ''}</p>`;
  updateCount();
}

function updateCount() {
  const left = G.codes.length - (G.mode === 'play' ? G.placed.size : 0);
  $('.tray-count', G.el).textContent = G.mode === 'play'
    ? `zostało ${left}` : `${G.codes.length} ${plural(G.codes.length, 'kraj', 'kraje', 'krajów')}`;
}

function updateStats() {
  if (G.mode !== 'play') return;
  const el = G.el;
  $('.mg-prog', el).textContent = `${G.placed.size}/${G.codes.length}`;
  $('.mg-score', el).textContent = fmtNum(G.score);
  $('.mg-streak', el).textContent = G.streak;
  const m = mapMult(G.streak);
  $('.mult', el).textContent = m > 1 ? multLabel(m) : '';
  $('.pill.streak', el).classList.toggle('hot', G.streak >= 5);
  updateCount();
}

// ------------------------------------------------------------ czas

function startTimer() {
  stopTimer();
  G.tRun = performance.now();
  G.timer = setInterval(tickTime, 500);
}

function stopTimer() {
  if (!G || G.tRun === null) return;
  G.elapsed += (performance.now() - G.tRun) / 1000;
  G.tRun = null;
  clearInterval(G.timer);
}

function elapsedNow() {
  return G.elapsed + (G.tRun !== null ? (performance.now() - G.tRun) / 1000 : 0);
}

function tickTime() {
  const t = $('.mg-time', G.el);
  if (t) t.textContent = fmtTime(elapsedNow());
}

function onVis() {
  if (!G || G.mode !== 'play' || G.done) return;
  if (document.hidden) {
    stopTimer();
    persist();
  } else startTimer();
}

function persist() {
  if (!G || G.mode !== 'play') return;
  if (!G.placed.size && !G.mistakes) return;
  P.mapSaves[G.cont] = {
    placed: [...G.placed], revealed: [...G.revealed], attempts: G.attempts, hinted: [...G.hinted],
    mistakes: G.mistakes, score: G.score, streak: G.streak, bestStreak: G.bestStreak, elapsed: elapsedNow(),
  };
  save();
}

// ------------------------------------------------------------ kliknięcia

async function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'back') {
    if (G.mode === 'play' && !G.done && G.placed.size) toast('Postęp zapisany. Możesz wrócić później.', { ms: 2000 });
    return go('maps');
  }
  if (act === 'zin') G.mv.zoomBy(1.6);
  if (act === 'zout') G.mv.zoomBy(1 / 1.6);
  if (act === 'zfit') G.mv.fit();
  if (act === 'hint') hint();
  if (act === 'help-ok') {
    P.settings.mapHelpSeen = true;
    save();
    b.closest('.mg-help').remove();
  }
  if (act === 'info-close') closeInfo();
  if (act === 'again') go('mapgame', { cont: G.cont, mode: 'play' });
  if (act === 'pick') go('maps');
}

function showHelp() {
  const box = document.createElement('div');
  box.className = 'mg-help';
  box.innerHTML = `
    <div class="help-card">
      <div class="help-anim"><span class="h-chip">🇵🇱 Polska</span><span class="h-hand">👆</span></div>
      <h3>Jak grać?</h3>
      <ul>
        <li><b>Przeciągnij</b> nazwę kraju z listy na jego miejsce na mapie.</li>
        <li>Albo <b>stuknij nazwę</b>, a potem miejsce na mapie.</li>
        <li><b>Dwoma palcami</b> przybliżysz i przesuniesz mapę. Małe państwa mają kółka.</li>
        <li>Masz 3 próby na każdy kraj. Seria dobrych odpowiedzi mnoży punkty! 🔥</li>
      </ul>
      <button class="btn primary" data-act="help-ok">Zaczynamy!</button>
    </div>`;
  $('.mg-map', G.el).appendChild(box);
}

// ------------------------------------------------------------ zaznaczanie (stuknij nazwę, potem mapę)

function select(code) {
  G.selected = G.selected === code ? null : code;
  for (const ch of G.el.querySelectorAll('.chip')) ch.classList.toggle('sel', ch.dataset.c === G.selected);
  const ban = $('.sel-banner', G.el);
  if (G.selected && G.mode === 'play') {
    const c = country(G.selected);
    ban.innerHTML = `<img src="${flagUrl(c.code)}" alt=""><span>Gdzie leży <b>${esc(c.name)}</b>? Stuknij to miejsce na mapie.</span>`;
    ban.classList.remove('hidden');
  } else ban.classList.add('hidden');
  if (G.mode === 'explore' && G.selected) {
    G.mv.zoomTo(G.selected);
    showInfo(G.selected);
  }
}

function onMapTap(x, y, hit) {
  if (!G || G.done && G.mode === 'play' && !hit) return;
  if (G.mode === 'explore' || G.done) {
    if (hit && hit.code) showInfo(hit.code, hit.kind !== 'target');
    else closeInfo();
    return;
  }
  if (G.selected) {
    const code = G.selected;
    const r = attempt(code, x, y);
    if (r === null) return;
    if (r) select(null);
  } else if (hit && hit.kind === 'target' && G.placed.has(hit.code)) {
    showInfo(hit.code);
  } else {
    toast('Najpierw wybierz kraj z listy 👉', { ms: 1600 });
  }
}

// ------------------------------------------------------------ przeciąganie

function onChipDown(e) {
  const chip = e.target.closest('.chip');
  if (!chip || !G || (G.mode === 'play' && G.done)) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const d = { chip, code: chip.dataset.c, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
    type: e.pointerType, active: false, moved: false };
  G.drag = d;
  if (G.mode === 'play') d.timer = setTimeout(() => { if (G && G.drag === d && !d.moved) startDrag(); }, 280);
}

function onWinMove(e) {
  const d = G && G.drag;
  if (!d || e.pointerId !== d.id) return;
  d.x = e.clientX;
  d.y = e.clientY;
  const dx = e.clientX - d.x0;
  const dy = e.clientY - d.y0;
  if (Math.hypot(dx, dy) > 8) d.moved = true;
  if (!d.active) {
    if (G.mode !== 'play') return;
    const side = matchMedia('(orientation: landscape)').matches;
    const along = side ? Math.abs(dx) : Math.abs(dy);
    const across = side ? Math.abs(dy) : Math.abs(dx);
    if (d.type === 'mouse' ? Math.hypot(dx, dy) > 6 : along > 10 && along > across * 1.1) startDrag();
    else if (d.moved) clearTimeout(d.timer);
    return;
  }
  e.preventDefault();
  moveGhost();
}

function onWinUp(e) {
  const d = G && G.drag;
  if (!d || e.pointerId !== d.id) return;
  clearTimeout(d.timer);
  if (d.active && !d.moved) {
    // przytrzymane, ale nieprzesunięte: traktuj jak stuknięcie
    endDrag(true);
    select(d.code);
    return;
  }
  if (d.active) drop();
  else if (!d.moved) {
    G.drag = null;
    sfx.tick();
    select(d.code);
    return;
  }
  G.drag = null;
}

function onWinCancel(e) {
  const d = G && G.drag;
  if (!d || e.pointerId !== d.id) return;
  clearTimeout(d.timer);
  if (d.active) endDrag(false);
  G.drag = null;
}

function startDrag() {
  const d = G.drag;
  if (!d || d.active) return;
  clearTimeout(d.timer);
  d.active = true;
  d.offY = d.type === 'touch' ? 46 : 8;
  const c = country(d.code);
  const gh = document.createElement('div');
  gh.className = 'dg';
  gh.innerHTML = `<div class="dg-chip"><img src="${flagUrl(c.code)}" alt=""><span>${esc(c.name)}</span></div><i class="dg-pin"></i>`;
  document.body.appendChild(gh);
  d.ghost = gh;
  d.chip.classList.add('dragging');
  document.body.classList.add('dragging-chip');
  try { d.chip.setPointerCapture(d.id); } catch (_) { /* nic */ }
  sfx.pick();
  closeInfo();
  moveGhost();
  requestAnimationFrame(() => gh.classList.add('lift'));
}

function tip(d) {
  return { x: d.x, y: d.y - d.offY };
}

function moveGhost() {
  const d = G.drag;
  if (!d || !d.ghost) return;
  const p = tip(d);
  d.ghost.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
  if (!d.raf) {
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      if (!G || G.drag !== d) return;
      const t = tip(d);
      const hit = G.mv.hitAt(t.x, t.y);
      G.mv.hover(hit && hit.kind === 'target' && !G.placed.has(hit.code) ? hit.code : null);
      $('.mg-map', G.el).classList.toggle('drop-on', !!hit);
    });
  }
}

function drop() {
  const d = G.drag;
  const p = tip(d);
  G.mv.hover(null);
  $('.mg-map', G.el).classList.remove('drop-on');
  const ok = attempt(d.code, p.x, p.y);
  if (ok === true) {
    const lp = G.mv.labelPoint(d.code);
    flyGhost(d, lp, true);
  } else {
    flyGhost(d, null, false);
    if (ok === null) sfx.drop();
  }
  d.chip.classList.remove('dragging');
  document.body.classList.remove('dragging-chip');
}

function endDrag(silent) {
  const d = G && G.drag;
  if (!d) return;
  if (d.ghost) silent ? d.ghost.remove() : flyGhost(d, null, false);
  d.chip.classList.remove('dragging');
  document.body.classList.remove('dragging-chip');
  G.mv && G.mv.hover(null);
  G.drag = null;
}

function flyGhost(d, to, success) {
  const gh = d.ghost;
  if (!gh) return;
  d.ghost = null;
  gh.classList.add(success ? 'fly-in' : 'fly-back');
  if (success && to) {
    gh.style.transform = `translate3d(${to.x}px,${to.y}px,0) scale(.3)`;
  } else {
    const r = d.chip.isConnected ? d.chip.getBoundingClientRect() : null;
    if (r) gh.style.transform = `translate3d(${r.left + r.width / 2}px,${r.top + r.height}px,0)`;
  }
  setTimeout(() => gh.remove(), 380);
}

// ------------------------------------------------------------ ocena ruchu

/** true = dobrze, false = źle, null = upuszczone poza mapą (bez kary). */
function attempt(code, x, y) {
  if (G.done || G.placed.has(code)) return null;
  const hit = G.mv.hitAt(x, y);
  if (!hit) return null;
  let ok = hit.kind === 'target' && hit.code === code;
  if (!ok) ok = G.mv.isNear(x, y, code, hit.kind === 'target' ? 9 : 20);
  if (ok) place(code, false);
  else wrong(code, hit, x, y);
  return ok;
}

function place(code, revealed) {
  if (G.placed.has(code)) return;
  G.placed.add(code);
  const att = G.attempts[code] || 0;
  const hinted = G.hinted.has(code);
  let pts = 0;
  let multUp = false;
  if (revealed) {
    G.revealed.add(code);
    recordAnswer('map', code, false);
  } else {
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    const base = BASE[att] || BASE[BASE.length - 1];
    const mult = mapMult(G.streak);
    multUp = mult > 1 && mapMult(G.streak - 1) < mult;
    pts = Math.round((hinted ? Math.ceil(base / 2) : base) * mult);
    G.score += pts;
    recordAnswer('map', code, att === 0 && !hinted);
    noteStreak(G.streak);
    announceLevel(addXP(pts));
    const won = checkBadges({ streak: G.streak });
    announceBadges(won);
  }
  const mv = G.mv;
  mv.setClass(code, 'placed');
  if (revealed) mv.setClass(code, 'revealed');
  mv.showLabel(code);
  mv.forceLabel(code, true);
  setTimeout(() => G && G.mv === mv && mv.forceLabel(code, false), 1800);
  mv.flash(code, 'pop', 800);
  const lp = mv.labelPoint(code);
  if (!revealed) {
    multUp ? sfx.combo() : sfx.place();
    floatText(`+${pts}`, lp.x, lp.y - 10, 'good');
    if (multUp) setTimeout(() => floatText(`Seria ${multLabel(mapMult(G.streak))}!`, lp.x, lp.y - 40, 'combo'), 200);
    confetti({ x: lp.x, y: lp.y, count: 22, spread: 0.55 });
  }
  removeChip(code);
  if (G.selected === code) select(null);
  updateStats();
  if (G.placed.size === G.codes.length) setTimeout(finish, revealed ? 300 : 650);
  else persist();
}

function wrong(code, hit, x, y) {
  G.mistakes++;
  G.streak = 0;
  const a = (G.attempts[code] || 0) + 1;
  G.attempts[code] = a;
  if (hit.kind === 'target') G.mv.flash(hit.code, 'bad', 900);
  else if (hit.kind === 'ctx' && hit.el) G.mv.flashEl(hit.el, 'bad', 900);
  sfx.bad();
  ripple(x, y);
  const chip = G.el.querySelector(`.chip[data-c="${code}"]`);
  if (chip) {
    chip.classList.remove('shake');
    void chip.offsetWidth;
    chip.classList.add('shake');
    const old = chip.querySelector('.tries');
    if (old) old.remove();
    chip.insertAdjacentHTML('beforeend', dots(code));
  }
  if (a >= MAX_TRIES) {
    reveal(code);
  } else {
    const left = MAX_TRIES - a;
    floatText(`Nie tutaj! ${left === 1 ? 'Ostatnia próba' : `Jeszcze ${left} próby`}`, x, y - 24, 'bad');
  }
  updateStats();
  persist();
}

function reveal(code) {
  const c = country(code);
  G.attempts[code] = MAX_TRIES;
  removeChip(code);
  if (G.selected === code) select(null);
  toast(`<img class="t-flag" src="${flagUrl(code)}" alt=""><span><small>Tu leży</small><b>${esc(c.name)}</b></span>`, { ms: 2200 });
  G.mv.flash(code, 'reveal', 1700);
  const o = G.mv.items.get(code);
  if (o && (o.it.tiny || G.mv.zoom < 1.3) && Math.max(o.it.lb[0], o.it.lb[1]) * G.mv.view.s < 26) G.mv.zoomTo(code);
  const mv = G.mv;
  setTimeout(() => { if (G && G.mv === mv) place(code, true); }, 1500);
}

function removeChip(code) {
  const chip = G.el.querySelector(`.chip[data-c="${code}"]`);
  if (!chip) return;
  chip.classList.add('gone');
  setTimeout(() => chip.remove(), 320);
}

function ripple(x, y) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  document.body.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

function hint() {
  if (G.done) return;
  const code = G.selected;
  if (!code) {
    toast('Stuknij kraj na liście, a potem 💡 — pokażę, gdzie leży', { ms: 2400 });
    return;
  }
  G.hinted.add(code);
  sfx.hint();
  const o = G.mv.items.get(code);
  if (o && Math.max(o.it.lb[0], o.it.lb[1]) * G.mv.view.s < 30) G.mv.zoomTo(code);
  setTimeout(() => G && G.mv.flash(code, 'hint', 2100), 250);
  toast('Podpowiedź: ten kraj da połowę punktów', { ms: 1800 });
  persist();
}

// ------------------------------------------------------------ informacja o kraju

function showInfo(code, other = false) {
  const c = country(code);
  if (!c) return;
  const card = $('.info-card', G.el);
  if (G.info) G.mv.setClass(G.info, 'sel', false);
  G.info = code;
  if (!other) G.mv.setClass(code, 'sel', true);
  card.innerHTML = `
    <img src="${flagUrl(code)}" alt="">
    <div><b>${esc(c.name)}</b><small>Stolica: ${esc(c.capital)}</small>
      ${other ? `<small class="muted">${esc(c.continents.map(regionName).join(', '))}</small>` : ''}</div>
    <button class="iconbtn small" data-act="info-close" aria-label="Zamknij">✕</button>`;
  card.classList.remove('hidden');
}

function closeInfo() {
  if (!G) return;
  if (G.info) G.mv.setClass(G.info, 'sel', false);
  G.info = null;
  const card = $('.info-card', G.el);
  if (card) card.classList.add('hidden');
}

// ------------------------------------------------------------ koniec gry

function finish() {
  if (!G || G.done) return;
  G.done = true;
  stopTimer();
  const N = G.codes.length;
  const time = Math.round(G.elapsed);
  const errRate = G.mistakes / N;
  const stars = errRate <= 0.05 ? 3 : errRate <= 0.2 ? 2 : 1;
  const perfect = G.mistakes === 0 && G.hinted.size === 0;
  const bonus = stars * 30 + (perfect ? 50 : 0);
  G.score += bonus;
  const lvl = addXP(bonus);
  const prevBest = P.maps[G.cont]?.time || 0;
  const res = recordMap(G.cont, { stars, time, score: G.score, perfect });
  delete P.mapSaves[G.cont];
  save();
  const won = checkBadges({ mapDone: { cont: G.cont, time, mistakes: G.mistakes } });
  updateStats();
  select(null);
  $('.hint-btn', G.el)?.classList.add('hidden');
  const done = $('.tray-done', G.el);
  done.innerHTML = `<p>🎉 Mapa ułożona!</p>
    <button class="btn primary" data-act="again">Zagraj jeszcze raz</button>
    <button class="btn ghost" data-act="pick">Inny kontynent</button>`;
  done.classList.remove('hidden');
  G.mv.fit();
  confetti({ count: 200 });
  sfx.win();
  announceLevel(lvl);

  const cont = G.cont;
  modal(`
    <div class="sum-head">
      <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="--d:${i * 0.15}s">★</span>`).join('')}</div>
      <h2>${esc(regionName(cont))} ułożona!</h2>
      <p class="muted">${perfect ? 'Bez ani jednego błędu! 🎯' : stars === 3 ? 'Prawie bezbłędnie!' : stars === 2 ? 'Bardzo dobrze!' : 'Udało się! Następnym razem będzie jeszcze lepiej.'}</p>
    </div>
    <div class="sum-stats">
      <div><b>${fmtTime(time)}</b><small>${res.isBestTime ? '🏆 nowy rekord!' : prevBest ? `rekord ${fmtTime(Math.min(prevBest, time))}` : 'czas'}</small></div>
      <div><b>${G.mistakes}</b><small>${plural(G.mistakes, 'błąd', 'błędy', 'błędów')}</small></div>
      <div><b>+${fmtNum(G.score)}</b><small>XP</small></div>
      <div><b>${G.bestStreak} 🔥</b><small>najdłuższa seria</small></div>
    </div>
    ${won.length ? `<div class="sum-badges">${won.map((b) => `<span class="sb"><i>${b.emoji}</i>${esc(b.name)}</span>`).join('')}</div>` : ''}
    <div class="modal-actions wrap">
      <button class="btn ghost" data-close="view">Obejrzyj mapę</button>
      <button class="btn ghost" data-close="pick">Inny kontynent</button>
      <button class="btn primary" data-close="again">Jeszcze raz</button>
    </div>`, {
    cls: 'summary',
    onClose: (v) => {
      if (v === 'again') go('mapgame', { cont, mode: 'play' });
      else if (v === 'pick') go('maps');
    },
  });
  announceBadges(won);
}
