// Wybór kontynentu do gry na mapie.

import { D, countriesIn, REGION_STYLE } from './data.js';
import { P } from './store.js';
import { go } from './nav.js';
import { thumbSVG } from './svgmap.js';
import { sfx } from './fx.js';
import { fmtTime, fmtNum, plural } from './util.js';

export function enter(el) {
  el.innerHTML = `
  <div class="page maps">
    <header class="topbar">
      <button class="iconbtn" data-act="back" aria-label="Wróć">‹</button>
      <div class="tb-title"><h1>🗺️ Mapa</h1><p>Wybierz kontynent i ułóż na nim wszystkie kraje</p></div>
    </header>
    <div class="conts">
      ${D.continents.map((c) => {
        const st = REGION_STYLE[c.id];
        const n = countriesIn(c.id).length;
        const best = P.maps[c.id];
        const sv = P.mapSaves[c.id];
        const stars = best?.stars || 0;
        return `
        <div class="cont" style="--c1:${st.color};--c2:${st.color2}">
          <div class="cont-art">${thumbSVG(c.id)}</div>
          <div class="cont-info">
            <h3>${st.emoji} ${c.name}</h3>
            <p class="muted">${n} ${plural(n, 'kraj', 'kraje', 'krajów')}</p>
            <div class="cont-stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
            <p class="best">${best ? `Rekord: ${fmtTime(best.time)} · ${fmtNum(best.score)} XP` : 'Jeszcze nieułożona'}</p>
            <div class="cont-btns">
              ${sv ? `<button class="btn primary" data-play="${c.id}" data-resume="1">Kontynuuj ${sv.placed.length}/${n}</button>
                      <button class="btn ghost" data-play="${c.id}">Od nowa</button>`
                   : `<button class="btn primary" data-play="${c.id}">Graj</button>`}
              <button class="btn ghost" data-learn="${c.id}">📖 Ucz się</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    sfx.tick();
    if (b.dataset.act === 'back') return go('home');
    if (b.dataset.play) go('mapgame', { cont: b.dataset.play, mode: 'play', resume: !!b.dataset.resume });
    if (b.dataset.learn) go('mapgame', { cont: b.dataset.learn, mode: 'explore' });
  };
}
