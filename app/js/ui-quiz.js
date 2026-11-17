// Quiz: flaga -> nazwa kraju albo kraj -> stolica. Wpisywanie lub wybór z 4 odpowiedzi.

import { D, country, countriesIn, regionName } from './data.js';
import { P, save, recordAnswer, addXP, checkBadges, noteStreak, pickItems } from './store.js';
import { go } from './nav.js';
import { makeMatcher, norm, normMap } from './match.js';
import { sfx, confetti, floatText, announceBadges, announceLevel, modal, confirmBox } from './fx.js';
import { $, esc, shuffle, flagUrl, collator } from './util.js';
import { KINDS } from './ui-setup.js';

let Q = null;
const matchers = {};

function matcherFor(kind) {
  if (!matchers[kind]) {
    matchers[kind] = makeMatcher(D.countries.map((c) => ({
      code: c.code,
      answers: kind === 'flags' ? [c.name, ...c.aliases] : [c.capital, ...c.capitalAliases],
    })));
  }
  return matchers[kind];
}

const answerOf = (kind, c) => (kind === 'flags' ? c.name : c.capital);
const aliasesOf = (kind, c) => (kind === 'flags' ? c.aliases : c.capitalAliases);

// ------------------------------------------------------------ podpowiadanie nazw przy wpisywaniu

const SG_MIN = 2;   // od tylu liter pokazuje się lista
const SG_MAX = 6;
const sgIndex = {};

function suggestIndex(kind) {
  if (!sgIndex[kind]) {
    const exact = new Set();
    const entries = D.countries.map((c) => {
      const main = answerOf(kind, c);
      [main, ...aliasesOf(kind, c)].forEach((a) => exact.add(norm(a)));
      const alts = aliasesOf(kind, c).filter((a) => norm(a) !== norm(main));
      return { code: c.code, label: main, s: normMap(main).s, alts: alts.map((a) => ({ label: a, s: normMap(a).s })) };
    });
    sgIndex[kind] = { entries, exact };
  }
  return sgIndex[kind];
}

/** Pasujące nazwy: najpierw zaczynające się od wpisanych liter, potem z takim słowem w środku, potem inne nazwy. */
function suggestionsFor(kind, text) {
  const q = normMap(text).s;
  if (q.length < SG_MIN) return { q, list: [] };
  const list = [];
  for (const e of suggestIndex(kind).entries) {
    let rank = e.s.startsWith(q) ? 0 : e.s.includes(` ${q}`) ? 1 : -1;
    let via = null;
    if (rank < 0) {
      for (const a of e.alts) {
        const r = a.s.startsWith(q) ? 2 : a.s.includes(` ${q}`) ? 3 : -1;
        if (r >= 0 && (rank < 0 || r < rank)) {
          rank = r;
          via = a.label;
        }
      }
    }
    if (rank >= 0) list.push({ code: e.code, label: e.label, rank, via });
  }
  list.sort((a, b) => a.rank - b.rank || collator.compare(a.label, b.label));
  const seen = new Set();
  return { q, list: list.filter((x) => !seen.has(x.label) && seen.add(x.label)).slice(0, SG_MAX) };
}

/** Pogrubia wpisany fragment w nazwie. */
function hl(label, q) {
  const { s, map } = normMap(label);
  let pos = s.startsWith(q) ? 0 : s.indexOf(` ${q}`);
  if (pos > 0) pos += 1;
  if (pos < 0 || !q) return esc(label);
  const a = map[pos];
  const b = map[pos + q.length - 1] + 1;
  return `${esc(label.slice(0, a))}<b>${esc(label.slice(a, b))}</b>${esc(label.slice(b))}`;
}
export const multFor = (streak) => (streak >= 20 ? 4 : streak >= 10 ? 3 : streak >= 5 ? 2 : 1);

// flagi, które łatwo pomylić: dobre jako złe odpowiedzi w trybie wyboru
const SIMILAR = [
  ['ID', 'MC', 'PL', 'SG'], ['RO', 'TD', 'AD', 'MD'], ['NL', 'LU', 'HR', 'PY', 'RU', 'FR', 'SI', 'SK', 'RS'],
  ['IE', 'CI', 'IT', 'MX', 'NE', 'IN'], ['AU', 'NZ', 'FJ', 'TV'], ['NO', 'IS', 'DK', 'FI', 'SE'],
  ['CO', 'EC', 'VE'], ['SV', 'NI', 'HN', 'GT', 'AR', 'UY'], ['SN', 'ML', 'GN', 'CM', 'GH', 'BO', 'LT'],
  ['EG', 'SY', 'IQ', 'YE', 'SD'], ['JO', 'PS', 'SD', 'KW', 'AE'], ['QA', 'BH'], ['BE', 'DE', 'UG'],
  ['AT', 'LV', 'LB', 'PE', 'CA'], ['CZ', 'PH', 'BS'], ['HT', 'LI'], ['CN', 'VN', 'TR', 'TN'],
  ['JP', 'BD', 'PW', 'LA'], ['KP', 'KR'], ['ZM', 'ZW', 'MW'], ['DZ', 'MR', 'PK', 'SA', 'TM', 'LY'],
  ['TT', 'KN', 'AG'], ['DM', 'GD', 'LC', 'VC'], ['BW', 'ZA', 'SZ', 'LS'], ['BN', 'MY', 'TH', 'KH'],
  ['US', 'LR', 'MY'], ['GB', 'AU', 'NZ'], ['CU', 'PA', 'DO'], ['FM', 'SO', 'VN'], ['KE', 'SS', 'MW'],
];

function distractors(code, kind) {
  const c = country(code);
  const pool = new Set();
  if (kind === 'flags') for (const g of SIMILAR) if (g.includes(code)) g.forEach((x) => pool.add(x));
  pool.delete(code);
  const out = shuffle([...pool]).slice(0, 2);
  const same = shuffle(D.countries.filter((x) => x.code !== code && !out.includes(x.code)
    && x.continents.some((k) => c.continents.includes(k))).map((x) => x.code));
  for (const x of same) if (out.length < 3) out.push(x);
  for (const x of shuffle(D.countries.map((x) => x.code))) if (out.length < 3 && x !== code && !out.includes(x)) out.push(x);
  return shuffle([code, ...out]);
}

// ------------------------------------------------------------ ekran

export function enter(el, params) {
  const kind = params.kind;
  const statMode = KINDS[kind].stat;
  const pool = countriesIn(params.region).map((c) => c.code);
  let items;
  if (params.items) items = shuffle([...params.items]);
  else {
    const n = params.count ? Math.min(params.count, pool.length) : pool.length;
    items = shuffle(pickItems(statMode, pool, n));
  }
  Q = {
    ...params, statMode, items, i: 0, score: 0, streak: 0, bestStreak: 0, correct: 0,
    mistakes: [], fast: 0, hintsUsed: 0, badges: [], done: false, el,
    suggestOn: params.mode === 'type' && P.settings.suggest !== false,
    sg: { list: [], i: -1, closed: false },
  };

  el.innerHTML = `
  <div class="quiz k-${kind}">
    <header class="qbar">
      <button class="iconbtn" data-act="quit" aria-label="Zakończ quiz">✕</button>
      <div class="qprog"><div class="bar"><i></i></div><span class="qcount"></span></div>
      <div class="qstats">
        <span class="pill score">⭐ <b>0</b></span>
        <span class="pill streak">🔥 <b>0</b><em class="mult"></em></span>
      </div>
    </header>
    <main class="qmain">
      <div class="qcard"></div>
      ${params.mode === 'type' ? `
      <form class="qform" autocomplete="off">
        <div class="qfield">
          <input class="qinput" type="text" autocomplete="off" autocorrect="off" autocapitalize="words"
            spellcheck="false" enterkeyhint="go" aria-autocomplete="list" aria-controls="qsuggest"
            placeholder="${kind === 'flags' ? 'Wpisz nazwę kraju…' : 'Wpisz stolicę…'}">
          <div class="suggest hidden" id="qsuggest" role="listbox" aria-label="Podpowiedzi"></div>
        </div>
        <button class="btn primary big" type="submit">Sprawdź</button>
      </form>
      <div class="qtools">
        <button class="btn ghost small" type="button" data-act="hint">💡 Podpowiedź</button>
        <span class="hint-text"></span>
        <button class="btn ghost small" type="button" data-act="skip">Nie wiem</button>
      </div>` : '<div class="choices"></div>'}
      <div class="qfeedback"></div>
    </main>
  </div>`;

  const form = $('.qform', el);
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      submitTyped();
    };
    const inp = $('.qinput', el);
    inp.addEventListener('input', () => {
      Q.sg.closed = false;
      renderSuggest();
    });
    inp.addEventListener('keydown', onInputKey);
    // stuknięcie w listę nie zabiera fokusu polu (klawiatura iPada zostaje)
    $('.suggest', el).addEventListener('pointerdown', (e) => e.preventDefault());
  }
  // stuknięcie poza polem chowa listę (np. żeby dostać się do podpowiedzi 💡)
  el.onpointerdown = (e) => {
    if (Q && Q.sg.list.length && !e.target.closest('.qform')) {
      Q.sg.closed = true;
      hideSuggest();
    }
  };
  el.onclick = (e) => {
    const b = e.target.closest('[data-act],[data-choice],[data-sg]');
    if (!b) return;
    if (b.dataset.choice) return choose(b);
    if (b.dataset.sg) {
      pickSuggest(Number(b.dataset.sg));
      refocus();
      return;
    }
    const act = b.dataset.act;
    if (act === 'quit') return quit();
    if (act === 'hint') hint();
    if (act === 'skip') skip();
    if (act === 'next') next();
    refocus();
  };
  document.addEventListener('keydown', onKey);
  window.visualViewport && visualViewport.addEventListener('resize', onViewport);
  ask();
}

export function leave() {
  document.removeEventListener('keydown', onKey);
  window.visualViewport && visualViewport.removeEventListener('resize', onViewport);
  if (Q) clearTimeout(Q.timer);
  Q = null;
}

function onKey(e) {
  if (!Q || Q.done || document.querySelector('.modal-wrap')) return;
  if (Q.mode === 'choice') {
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      const b = Q.el.querySelectorAll('[data-choice]')[n - 1];
      if (b) choose(b);
    } else if (e.key === 'Enter' && Q.cur.answered) next();
  }
}

function onViewport() {
  if (Q && Q.sg.list.length) fitSuggest();
}

function renderSuggest() {
  const box = Q && $('.suggest', Q.el);
  if (!box) return;
  const inp = $('.qinput', Q.el);
  const { q, list } = Q.suggestOn && !Q.cur.answered && !Q.sg.closed
    ? suggestionsFor(Q.kind, inp.value) : { q: '', list: [] };
  if (!list.length) {
    hideSuggest();
    return;
  }
  // domyślny wybór (Enter / Sprawdź) tylko gdy jest jasny: jedna nazwa zaczynająca się od wpisanych liter
  const starts = list.filter((x) => x.rank === 0);
  Q.sg.list = list;
  Q.sg.i = starts.length === 1 ? list.indexOf(starts[0]) : list.length === 1 ? 0 : -1;
  box.innerHTML = list.map((x, i) => `
    <button type="button" class="sg" data-sg="${i}" role="option">
      <span class="sg-t">${hl(x.label, q)}${x.via ? ` <small>${hl(x.via, q)}</small>` : ''}</span><kbd>↵</kbd>
    </button>`).join('');
  box.classList.remove('hidden', 'nudge');
  fitSuggest();
  markSuggest();
}

function markSuggest() {
  const box = $('.suggest', Q.el);
  box.querySelectorAll('.sg').forEach((b, i) => {
    b.classList.toggle('on', i === Q.sg.i);
    b.setAttribute('aria-selected', String(i === Q.sg.i));
  });
  const on = box.querySelector('.sg.on');
  if (!on) return;
  if (box.classList.contains('row')) {
    if (on.offsetLeft < box.scrollLeft) box.scrollLeft = on.offsetLeft - 6;
    else if (on.offsetLeft + on.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = on.offsetLeft + on.offsetWidth - box.clientWidth + 6;
  } else if (on.offsetTop < box.scrollTop) box.scrollTop = on.offsetTop - 6;
  else if (on.offsetTop + on.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = on.offsetTop + on.offsetHeight - box.clientHeight + 6;
}

/** Lista pod polem; gdy pod spodem mało miejsca (wysunięta klawiatura), układa się w jeden rząd. */
function fitSuggest() {
  const box = $('.suggest', Q.el);
  const r = $('.qinput', Q.el).getBoundingClientRect();
  const vv = window.visualViewport;
  const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const space = bottom - r.bottom - 14;
  const row = space < 120;
  box.classList.toggle('row', row);
  box.style.maxHeight = row ? '' : `${Math.round(space)}px`;
}

function hideSuggest() {
  if (!Q) return;
  Q.sg.list = [];
  Q.sg.i = -1;
  const box = $('.suggest', Q.el);
  if (box) {
    box.classList.add('hidden');
    box.innerHTML = '';
  }
}

function pickSuggest(i) {
  const x = Q.sg.list[i];
  if (!x || Q.cur.answered || Q.done) return;
  $('.qinput', Q.el).value = x.label;
  hideSuggest();
  submitTyped();
}

function onInputKey(e) {
  const n = Q.sg.list.length;
  if (!n) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    Q.sg.i = Math.min(n - 1, Q.sg.i + 1);
    markSuggest();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    Q.sg.i = Math.max(0, Q.sg.i - 1);
    markSuggest();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    Q.sg.closed = true;
    hideSuggest();
  } else if (e.key === 'Tab' && Q.sg.i >= 0) {
    e.preventDefault();
    e.target.value = Q.sg.list[Q.sg.i].label;
    renderSuggest();
  }
}

function refocus() {
  const inp = Q && $('.qinput', Q.el);
  if (inp && !Q.done) inp.focus({ preventScroll: true });
}

function updateBar() {
  const el = Q.el;
  $('.qprog i', el).style.width = `${(Q.i / Q.items.length) * 100}%`;
  $('.qcount', el).textContent = `${Math.min(Q.i + 1, Q.items.length)} / ${Q.items.length}`;
  $('.score b', el).textContent = Q.score;
  $('.streak b', el).textContent = Q.streak;
  const m = multFor(Q.streak);
  const multEl = $('.mult', el);
  multEl.textContent = m > 1 ? `×${m}` : '';
  $('.pill.streak', el).classList.toggle('hot', Q.streak >= 5);
}

function ask() {
  const el = Q.el;
  const code = Q.items[Q.i];
  const c = country(code);
  Q.cur = { code, t0: performance.now(), hints: 0, answered: false };
  updateBar();
  const card = $('.qcard', el);
  card.classList.remove('q-in', 'shake', 'good', 'bad');
  card.innerHTML = Q.kind === 'flags'
    ? `<div class="flag-frame"><img class="flag-big" src="${flagUrl(code)}" alt="Flaga do odgadnięcia"></div>
       <p class="qprompt">Jaki to kraj?</p>`
    : `<div class="cap-q"><img class="flag-mid" src="${flagUrl(code)}" alt="">
       <div><div class="cap-country">${esc(c.name)}</div><p class="qprompt">Jaka jest stolica tego kraju?</p></div></div>`;
  void card.offsetWidth;
  card.classList.add('q-in');
  $('.qfeedback', el).innerHTML = '';
  if (Q.mode === 'type') {
    const inp = $('.qinput', el);
    hideSuggest();
    Q.sg.closed = false;
    inp.value = '';
    inp.classList.remove('good', 'bad');
    $('.hint-text', el).textContent = '';
    $('.qtools', el).classList.remove('off');
    inp.focus({ preventScroll: true });
  } else {
    const opts = distractors(code, Q.kind);
    $('.choices', el).innerHTML = opts.map((x, i) => `
      <button class="choice" data-choice="${x}"><kbd>${i + 1}</kbd><span>${esc(answerOf(Q.kind, country(x)))}</span></button>`).join('');
  }
}

function submitTyped() {
  const cur = Q.cur;
  if (Q.done) return;
  if (cur.answered) {
    next();
    return;
  }
  const inp = $('.qinput', Q.el);
  if (Q.sg.list.length && !suggestIndex(Q.kind).exact.has(norm(inp.value))) {
    // wpisany początek nazwy: weź podświetloną podpowiedź; gdy kilka pasuje, najpierw pokaż wybór
    if (Q.sg.i >= 0) {
      pickSuggest(Q.sg.i);
      return;
    }
    Q.sg.i = 0;
    markSuggest();
    const box = $('.suggest', Q.el);
    box.classList.remove('nudge');
    void box.offsetWidth;
    box.classList.add('nudge');
    return;
  }
  hideSuggest();
  const r = matcherFor(Q.kind)(inp.value, cur.code);
  if (r.result === 'empty') {
    inp.classList.remove('shake');
    void inp.offsetWidth;
    inp.classList.add('shake');
    return;
  }
  if (r.result === 'exact' || r.result === 'typo') onCorrect(r.result === 'typo');
  else onWrong(r);
}

function choose(btn) {
  const cur = Q.cur;
  if (cur.answered || Q.done) return;
  const ok = btn.dataset.choice === cur.code;
  for (const b of Q.el.querySelectorAll('[data-choice]')) {
    b.classList.add(b.dataset.choice === cur.code ? 'good' : b === btn ? 'bad' : 'dim');
  }
  if (ok) onCorrect(false);
  else onWrong({ result: 'other', other: btn.dataset.choice, chosen: true });
}

function onCorrect(typo) {
  const cur = Q.cur;
  const c = country(cur.code);
  cur.answered = true;
  hideSuggest();
  const dt = (performance.now() - cur.t0) / 1000;
  Q.streak++;
  Q.bestStreak = Math.max(Q.bestStreak, Q.streak);
  Q.correct++;
  const typed = Q.mode === 'type';
  const base = typed ? (cur.hints ? 10 : 20) : 10;
  const speedy = dt < (typed ? 6 : 3.5);
  const mult = multFor(Q.streak);
  const pts = base * mult + (speedy ? 5 : 0);
  Q.score += pts;
  Q.fast = dt < 4 ? Q.fast + 1 : 0;
  recordAnswer(Q.statMode, cur.code, true, typed && !cur.hints);
  noteStreak(Q.streak);
  announceLevel(addXP(pts));
  const won = checkBadges({ streak: Q.streak, speedRun: Q.fast >= 5 });
  Q.badges.push(...won);
  announceBadges(won);

  const multUp = mult > 1 && multFor(Q.streak - 1) < mult;
  multUp ? sfx.combo() : sfx.good();
  updateBar();
  const card = $('.qcard', Q.el);
  card.classList.add('good');
  const r = card.getBoundingClientRect();
  floatText(`+${pts}`, r.left + r.width / 2, r.top + r.height * 0.35, 'good');
  if (multUp) setTimeout(() => floatText(`Seria ×${mult}!`, r.left + r.width / 2, r.top + r.height * 0.15, 'combo'), 250);
  if (typed) $('.qinput', Q.el).classList.add('good');

  const praise = ['Brawo!', 'Świetnie!', 'Super!', 'Doskonale!', 'Tak jest!', 'Znakomicie!'][Math.floor(Math.random() * 6)];
  $('.qfeedback', Q.el).innerHTML = `
    <div class="fb good">
      <span class="fb-ic">✓</span>
      <div><b>${praise} +${pts} XP</b>${speedy ? ' <span class="tag">⚡ szybko</span>' : ''}${mult > 1 ? ` <span class="tag">🔥 ×${mult}</span>` : ''}
      ${typo ? `<small>Mała literówka — poprawnie: <b>${esc(answerOf(Q.kind, c))}</b></small>`
        : Q.kind === 'capitals' ? `<small>${esc(c.capital)} to stolica kraju ${esc(c.name)}</small>` : `<small>${esc(c.name)} · stolica: ${esc(c.capital)}</small>`}
      </div>
    </div>`;
  if (typed) $('.qtools', Q.el).classList.add('off');
  Q.timer = setTimeout(next, typo ? 1900 : 1100);
}

function onWrong(r) {
  const cur = Q.cur;
  const c = country(cur.code);
  cur.answered = true;
  hideSuggest();
  Q.streak = 0;
  Q.fast = 0;
  Q.mistakes.push(cur.code);
  recordAnswer(Q.statMode, cur.code, false);
  sfx.bad();
  updateBar();
  const card = $('.qcard', Q.el);
  card.classList.add('bad', 'shake');
  if (Q.mode === 'type') {
    $('.qinput', Q.el).classList.add('bad');
    $('.qtools', Q.el).classList.add('off');
  }
  let other = '';
  if (r.result === 'other' && r.other) {
    const o = country(r.other);
    other = Q.kind === 'flags'
      ? `<small class="other"><img src="${flagUrl(o.code)}" alt=""> Tak wygląda flaga kraju ${esc(o.name)}.</small>`
      : `<small class="other">${esc(o.capital)} to stolica kraju ${esc(o.name)} <img src="${flagUrl(o.code)}" alt=""></small>`;
  }
  $('.qfeedback', Q.el).innerHTML = `
    <div class="fb bad">
      <span class="fb-ic">✗</span>
      <div><b>${r.result === 'skip' ? 'Odpowiedź' : 'Niestety'}: ${esc(answerOf(Q.kind, c))}</b>
        ${Q.kind === 'flags' ? `<small>Stolica: ${esc(c.capital)}</small>` : `<small>${esc(c.name)}</small>`}
        ${other}
      </div>
      <button class="btn primary next-btn" type="button" data-act="next">Dalej ›</button>
    </div>`;
}

function skip() {
  if (!Q.cur.answered) onWrong({ result: 'skip' });
}

function hint() {
  const cur = Q.cur;
  if (cur.answered) return;
  const ans = answerOf(Q.kind, country(cur.code));
  const letters = ans.replace(/[^\p{L}]/gu, '').length;
  const max = Math.max(1, Math.floor(letters / 3));
  if (cur.hints >= max) return;
  cur.hints++;
  Q.hintsUsed++;
  sfx.hint();
  let shown = 0;
  const mask = [...ans].map((ch) => {
    if (!/\p{L}/u.test(ch)) return ch === ' ' ? ' ' : ch;
    shown++;
    return shown <= cur.hints ? ch : '_';
  }).join(' ');
  $('.hint-text', Q.el).textContent = mask;
}

function next() {
  if (!Q || Q.done) return;
  clearTimeout(Q.timer);
  Q.i++;
  if (Q.i >= Q.items.length) finish();
  else ask();
}

async function quit() {
  if (Q.i === 0 && !Q.cur.answered) return go('setup', { kind: Q.kind });
  const k = Q.kind;
  if (await confirmBox('Zakończyć quiz?', 'Zdobyte punkty zostaną zapisane.', 'Zakończ', 'Graj dalej')) go('setup', { kind: k });
  else refocus();
}

function finish() {
  Q.done = true;
  const total = Q.items.length;
  const acc = Q.correct / total;
  const perfect = acc === 1 && total >= 10;
  const bonus = 20 + (perfect ? 50 : 0);
  Q.score += bonus;
  P.totals.rounds++;
  save();
  const lvl = addXP(bonus);
  const won = checkBadges({
    perfectRound: perfect,
    noHintRound: Q.mode === 'type' && total >= 20 && Q.hintsUsed === 0 && acc >= 0.9,
  });
  Q.badges.push(...won);
  updateBar();
  $('.qprog i', Q.el).style.width = '100%';
  const inp = $('.qinput', Q.el);
  if (inp) inp.blur();

  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0;
  const title = ['Dobry początek!', 'Nieźle, tak trzymaj!', 'Świetna robota!', 'Fantastycznie!'][stars];
  const mistakes = [...new Set(Q.mistakes)];
  const params = { kind: Q.kind, region: Q.region, count: Q.count, mode: Q.mode };
  if (stars >= 2) confetti({ count: stars === 3 ? 180 : 110 });
  sfx.win();
  announceLevel(lvl);

  modal(`
    <div class="sum-head">
      <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="--d:${i * 0.15}s">★</span>`).join('')}</div>
      <h2>${title}</h2>
      <p class="muted">${KINDS[Q.kind].title} · ${esc(regionName(Q.region))}</p>
    </div>
    <div class="sum-stats">
      <div><b>${Q.correct}/${total}</b><small>poprawnych</small></div>
      <div><b>${Math.round(acc * 100)}%</b><small>skuteczność</small></div>
      <div><b>+${Q.score}</b><small>XP${perfect ? ' (z bonusem)' : ''}</small></div>
      <div><b>${Q.bestStreak} 🔥</b><small>najdłuższa seria</small></div>
    </div>
    ${Q.badges.length ? `<div class="sum-badges">${Q.badges.map((b) => `<span class="sb"><i>${b.emoji}</i>${esc(b.name)}</span>`).join('')}</div>` : ''}
    ${mistakes.length ? `
      <h3 class="sum-sub">Do powtórki</h3>
      <div class="sum-mistakes">${mistakes.map((code) => {
        const c = country(code);
        return `<div class="mrow"><img src="${flagUrl(code)}" alt=""><span><b>${esc(c.name)}</b><small>${esc(c.capital)}</small></span></div>`;
      }).join('')}</div>` : '<p class="sum-perfect">Bez ani jednego błędu! 🎉</p>'}
    <div class="modal-actions wrap">
      <button class="btn ghost" data-close="menu">Menu</button>
      ${mistakes.length ? `<button class="btn warn" data-close="retry">Powtórz błędy (${mistakes.length})</button>` : ''}
      <button class="btn primary" data-close="again">Jeszcze raz</button>
    </div>`, {
    cls: 'summary',
    dismissable: false,
    onClose: (v) => {
      if (v === 'again') go('quiz', params);
      else if (v === 'retry') go('quiz', { ...params, items: mistakes });
      else go('setup', { kind: params.kind });
    },
  });
}

