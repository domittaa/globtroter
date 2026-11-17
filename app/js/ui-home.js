// Ekran startowy.

import { D } from './data.js';
import { P, levelInfo, masteredCount, dayStreak, BADGES, resetProgress, save } from './store.js';
import { go } from './nav.js';
import { worldSVG } from './svgmap.js';
import { modal, confirmBox, toast, sfx } from './fx.js';
import { fmtNum, plural } from './util.js';

export function playerCard() {
  const L = levelInfo();
  return `
    <div class="lvl-badge"><span>${L.level}</span></div>
    <div class="player-txt">
      <b>${L.emoji} ${L.title}</b>
      <div class="xpbar"><i style="width:${(L.progress * 100).toFixed(1)}%"></i></div>
      <small>${fmtNum(L.into)} / ${fmtNum(L.need)} XP do poziomu ${L.level + 1}</small>
    </div>`;
}

export function enter(el) {
  const all = D.countries.map((c) => c.code);
  const flags = masteredCount('flags', all);
  const caps = masteredCount('capitals', all);
  const conts = D.continents.map((c) => c.id);
  const mapsDone = conts.filter((c) => P.maps[c]).length;
  const stars = conts.reduce((n, c) => n + (P.maps[c]?.stars || 0), 0);
  const badges = Object.keys(P.badges).length;
  const streak = dayStreak();
  const pct = (n, of) => ((n / of) * 100).toFixed(1);

  el.innerHTML = `
  <div class="home">
    <div class="home-bg">${worldSVG({ cls: 'bg-world' })}</div>
    <header class="home-head">
      <div class="brand">
        <img src="icons/icon.svg" alt="" class="brand-ic">
        <div><h1>Globtroter</h1><p>Flagi, mapy i stolice świata</p></div>
      </div>
      <button class="player" data-go="badges" aria-label="Twój poziom i odznaki">${playerCard()}</button>
    </header>

    <div class="hello">
      <h2>Gdzie dziś wyruszamy?</h2>
      <div class="stat-row">
        <span class="stat ${streak ? 'hot' : ''}">🔥 <b>${streak}</b> ${plural(streak, 'dzień', 'dni', 'dni')} z rzędu</span>
        <span class="stat">⭐ <b>${fmtNum(P.xp)}</b> XP</span>
        <span class="stat">🏅 <b>${badges}</b> / ${BADGES.length} odznak</span>
      </div>
    </div>

    <div class="modes">
      <button class="mode m-flags" data-go="setup" data-kind="flags">
        <div class="mode-art flags-art">
          <img src="flags/br.svg" alt="" class="f3"><img src="flags/jp.svg" alt="" class="f2"><img src="flags/pl.svg" alt="" class="f1">
        </div>
        <div class="mode-txt">
          <h3>Flagi</h3>
          <p>Zobacz flagę i wpisz nazwę kraju</p>
          <div class="mode-prog"><div class="bar"><i style="width:${pct(flags, all.length)}%"></i></div>
            <span>${flags} / ${all.length} opanowanych</span></div>
        </div>
      </button>
      <button class="mode m-map" data-go="maps">
        <div class="mode-art map-art">${worldSVG({ cls: 'art-world' })}<span class="pin">📍</span></div>
        <div class="mode-txt">
          <h3>Mapa</h3>
          <p>Przeciągnij kraje na ich miejsce</p>
          <div class="mode-prog"><div class="bar"><i style="width:${pct(stars, conts.length * 3)}%"></i></div>
            <span>${mapsDone} / ${conts.length} kontynentów · ${stars} / ${conts.length * 3} ⭐</span></div>
        </div>
      </button>
      <button class="mode m-caps" data-go="setup" data-kind="capitals">
        <div class="mode-art caps-art"><span class="big">🏛️</span><span class="p1">📍</span><span class="p2">📍</span><span class="p3">📍</span></div>
        <div class="mode-txt">
          <h3>Stolice</h3>
          <p>Zobacz kraj i wpisz jego stolicę</p>
          <div class="mode-prog"><div class="bar"><i style="width:${pct(caps, all.length)}%"></i></div>
            <span>${caps} / ${all.length} opanowanych</span></div>
        </div>
      </button>
    </div>

    <div class="more">
      <button class="tile" data-go="atlas"><span class="tile-ic">📖</span><span><b>Atlas krajów</b><small>Flagi, stolice i położenie</small></span></button>
      <button class="tile" data-go="badges"><span class="tile-ic">🏅</span><span><b>Odznaki i statystyki</b><small>${badges} z ${BADGES.length} zdobytych</small></span></button>
      <button class="tile" data-act="settings"><span class="tile-ic">⚙️</span><span><b>Ustawienia</b><small>Dźwięk, postępy</small></span></button>
    </div>
  </div>`;

  el.onclick = (e) => {
    const b = e.target.closest('[data-go],[data-act]');
    if (!b) return;
    sfx.tick();
    if (b.dataset.act === 'settings') return openSettings(el);
    go(b.dataset.go, { kind: b.dataset.kind });
  };
}

function openSettings(homeEl) {
  const m = modal(`
    <h2>⚙️ Ustawienia</h2>
    <label class="switch-row">
      <span><b>Dźwięki</b><small>Odgłosy przy odpowiedziach i nagrodach</small></span>
      <input type="checkbox" id="set-sound" ${P.settings.sound ? 'checked' : ''}><i class="switch"></i>
    </label>
    <div class="set-row">
      <span><b>Wyczyść postępy</b><small>Usuwa punkty, odznaki i opanowane kraje</small></span>
      <button class="btn danger small" id="set-reset">Wyczyść</button>
    </div>
    <p class="credits">Kontury państw: Natural Earth (domena publiczna). Flagi: flag-icons (licencja MIT).
      Postępy są zapisane tylko na tym urządzeniu.</p>
    <div class="modal-actions"><button class="btn primary" data-close="ok">Gotowe</button></div>
  `, { cls: 'small' });
  m.el.querySelector('#set-sound').onchange = (e) => {
    P.settings.sound = e.target.checked;
    save();
    sfx.good();
  };
  m.el.querySelector('#set-reset').onclick = async () => {
    m.close();
    if (await confirmBox('Wyczyścić postępy?', 'Stracisz wszystkie punkty, odznaki i rekordy. Tego nie da się cofnąć.', 'Wyczyść', 'Anuluj', true)) {
      resetProgress();
      toast('Postępy wyczyszczone');
      enter(homeEl);
    }
  };
}
