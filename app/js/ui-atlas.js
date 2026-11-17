// Atlas: przegląd wszystkich krajów z flagą, stolicą i położeniem na mapie świata.

import { regions, countriesIn, regionName, country, REGION_STYLE } from './data.js';
import { itemStat } from './store.js';
import { go } from './nav.js';
import { worldSVG } from './svgmap.js';
import { norm } from './match.js';
import { modal, sfx } from './fx.js';
import { $, esc, flagUrl } from './util.js';

let state = { region: 'world', q: '' };

const pips = (lvl) => [0, 1, 2].map((i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');

export function enter(el) {
  el.innerHTML = `
  <div class="page atlas">
    <header class="topbar">
      <button class="iconbtn" data-act="back" aria-label="Wróć">‹</button>
      <div class="tb-title"><h1>📖 Atlas krajów</h1><p>Stuknij kraj, żeby zobaczyć go na mapie</p></div>
      <input class="atlas-search" type="search" placeholder="Szukaj kraju lub stolicy…" autocomplete="off" autocorrect="off" spellcheck="false">
    </header>
    <div class="tabs">${regions().map((r) => `
      <button class="tab ${state.region === r.id ? 'on' : ''}" data-r="${r.id}" style="--c1:${REGION_STYLE[r.id].color}">
        ${REGION_STYLE[r.id].emoji} ${esc(r.name)} <small>${countriesIn(r.id).length}</small></button>`).join('')}
    </div>
    <div class="atlas-legend"><span>🏳️ flaga</span><span>🏛️ stolica</span><span>🗺️ mapa</span><span class="muted">· trzy kropki = opanowane</span></div>
    <div class="atlas-grid"></div>
  </div>`;
  const search = $('.atlas-search', el);
  search.value = state.q;
  search.oninput = () => {
    state.q = search.value;
    renderGrid(el);
  };
  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'back') return go('home');
    if (b.dataset.r) {
      state.region = b.dataset.r;
      sfx.tick();
      for (const t of el.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.r === state.region);
      renderGrid(el);
    }
    if (b.dataset.c) openCountry(b.dataset.c);
  };
  renderGrid(el);
}

function renderGrid(el) {
  const q = norm(state.q);
  const list = countriesIn(state.region).filter((c) => !q
    || norm(c.name).includes(q) || norm(c.capital).includes(q)
    || c.aliases.some((a) => norm(a).includes(q)) || c.capitalAliases.some((a) => norm(a).includes(q)));
  $('.atlas-grid', el).innerHTML = list.length ? list.map((c) => `
    <button class="acard" data-c="${c.code}">
      <img src="${flagUrl(c.code)}" alt="" loading="lazy">
      <div><b>${esc(c.name)}</b><small>${esc(c.capital)}</small>
        <div class="mlv">
          <span>🏳️${pips(itemStat('flags', c.code).lvl)}</span>
          <span>🏛️${pips(itemStat('capitals', c.code).lvl)}</span>
          <span>🗺️${pips(itemStat('map', c.code).lvl)}</span>
        </div>
      </div>
    </button>`).join('') : '<p class="muted">Nic nie znaleziono.</p>';
}

export function openCountry(code) {
  const c = country(code);
  sfx.tick();
  const row = (label, mode) => {
    const s = itemStat(mode, code);
    return `<div class="cd-st"><span>${label}</span><span class="pips">${pips(s.lvl)}</span>
      <small>${s.ok + s.bad ? `${s.ok} ✓ · ${s.bad} ✗` : 'jeszcze nie było'}</small></div>`;
  };
  modal(`
    <div class="cdetail">
      <div class="cd-top">
        <img class="flag-xl" src="${flagUrl(code)}" alt="Flaga: ${esc(c.name)}">
        <div class="cd-txt">
          <h2>${esc(c.name)}</h2>
          <p class="cd-cap">🏛️ Stolica: <b>${esc(c.capital)}</b></p>
          <p class="muted">${c.continents.map((k) => `${REGION_STYLE[k].emoji} ${esc(regionName(k))}`).join(' · ')}</p>
          ${c.aliases.filter((a) => a.length > 3).length ? `<p class="muted small">Inne nazwy: ${esc(c.aliases.filter((a) => a.length > 3).join(', '))}</p>` : ''}
        </div>
      </div>
      <div class="cd-map">${worldSVG({ focus: code, region: c.continents[0] })}</div>
      <div class="cd-stats">${row('🏳️ Flaga', 'flags')}${row('🏛️ Stolica', 'capitals')}${row('🗺️ Mapa', 'map')}</div>
      <div class="modal-actions"><button class="btn primary" data-close="ok">Zamknij</button></div>
    </div>`, { cls: 'country' });
}

