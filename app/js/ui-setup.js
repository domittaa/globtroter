// Wybór regionu i ustawień quizu (flagi / stolice).

import { regions, countriesIn, REGION_STYLE } from './data.js';
import { P, save, masteredCount } from './store.js';
import { go } from './nav.js';
import { thumbSVG, worldSVG } from './svgmap.js';
import { sfx } from './fx.js';
import { plural } from './util.js';

export const KINDS = {
  flags: { emoji: '🏳️', title: 'Flagi', sub: 'Zobacz flagę i wpisz nazwę kraju', stat: 'flags' },
  capitals: { emoji: '🏛️', title: 'Stolice', sub: 'Zobacz kraj i wpisz jego stolicę', stat: 'capitals' },
};

export function enter(el, { kind = 'flags' }) {
  const K = KINDS[kind];
  const s = P.settings;
  const seg = (opt, items) => `<div class="seg" data-opt="${opt}">${items.map(([v, label]) =>
    `<button data-v="${v}" class="${String(s[opt]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;

  el.innerHTML = `
  <div class="page setup k-${kind}">
    <header class="topbar">
      <button class="iconbtn" data-act="back" aria-label="Wróć">‹</button>
      <div class="tb-title"><h1>${K.emoji} ${K.title}</h1><p>${K.sub}</p></div>
    </header>
    <div class="setup-opts">
      <div class="opt"><span>Liczba pytań</span>${seg('count', [[10, '10'], [20, '20'], [0, 'Wszystkie']])}</div>
      <div class="opt"><span>Odpowiadam</span>${seg('answerMode', [['type', '⌨️ Wpisuję'], ['choice', '👆 Wybieram z 4']])}</div>
      ${s.answerMode === 'type' ? `<div class="opt"><span>Podpowiadanie nazw</span>${seg('suggest', [['true', 'Tak'], ['false', 'Nie']])}</div>` : ''}
    </div>
    <p class="opt-note">${s.answerMode === 'type'
      ? `Wpisywanie daje 2× więcej punktów i trzecią gwiazdkę opanowania. Polskie znaki i drobne literówki są w porządku.${
        s.suggest !== false ? ' Po dwóch literach pojawi się lista pasujących nazw do wyboru.' : ''}`
      : 'Tryb z wyborem jest łatwiejszy: dobry na początek. Trzecią gwiazdkę opanowania daje tylko wpisywanie.'}</p>
    <h2 class="sec-title">Wybierz region</h2>
    <div class="regions">
      ${regions().map((r) => {
        const codes = countriesIn(r.id).map((c) => c.code);
        const m = masteredCount(K.stat, codes);
        const st = REGION_STYLE[r.id];
        return `
        <button class="region" data-r="${r.id}" style="--c1:${st.color};--c2:${st.color2}">
          <div class="region-art">${r.id === 'world' ? worldSVG({ region: 'world', cls: 'rg-world' }) : thumbSVG(r.id)}</div>
          <div class="region-txt">
            <b>${st.emoji} ${r.name}</b>
            <small>${codes.length} ${plural(codes.length, 'kraj', 'kraje', 'krajów')}</small>
            <div class="mini-prog"><i style="width:${((m / codes.length) * 100).toFixed(1)}%"></i></div>
            <small>${m} ${plural(m, 'opanowany', 'opanowane', 'opanowanych')}</small>
          </div>
        </button>`;
      }).join('')}
    </div>
  </div>`;

  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'back') return go('home');
    const segEl = b.closest('.seg');
    if (segEl) {
      const opt = segEl.dataset.opt;
      const v = b.dataset.v;
      s[opt] = opt === 'count' ? Number(v) : opt === 'suggest' ? v === 'true' : v;
      save();
      sfx.tick();
      enter(el, { kind });
      return;
    }
    if (b.dataset.r) {
      go('quiz', { kind, region: b.dataset.r, count: s.count, mode: s.answerMode });
    }
  };
}
