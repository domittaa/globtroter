// Odznaki, poziomy i statystyki.

import { D } from './data.js';
import { P, BADGES, TITLES, xpFor, levelInfo, masteredCount, dayStreak } from './store.js';
import { go } from './nav.js';
import { playerCard } from './ui-home.js';
import { esc, fmtNum } from './util.js';

export function enter(el) {
  const all = D.countries.map((c) => c.code);
  const L = levelInfo();
  const acc = P.totals.answers ? Math.round((P.totals.correct / P.totals.answers) * 100) : 0;
  const mapsDone = D.continents.filter((c) => P.maps[c.id]).length;
  const got = BADGES.filter((b) => P.badges[b.id]).length;
  const tile = (v, label) => `<div class="stile"><b>${v}</b><small>${label}</small></div>`;
  const dateOf = (ts) => new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

  el.innerHTML = `
  <div class="page badges-page">
    <header class="topbar">
      <button class="iconbtn" data-act="back" aria-label="Wróć">‹</button>
      <div class="tb-title"><h1>🏅 Odznaki i statystyki</h1><p>Zbieraj punkty, awansuj i odblokowuj odznaki</p></div>
    </header>
    <div class="player wide">${playerCard()}</div>
    <div class="stats-grid">
      ${tile(fmtNum(P.xp), 'punktów XP')}
      ${tile(`${dayStreak()} 🔥`, `dni z rzędu (rekord ${P.day.best})`)}
      ${tile(P.bestStreak, 'najdłuższa seria odpowiedzi')}
      ${tile(`${acc}%`, `skuteczność (${fmtNum(P.totals.answers)} odp.)`)}
      ${tile(`${masteredCount('flags', all)}/${all.length}`, 'opanowane flagi')}
      ${tile(`${masteredCount('capitals', all)}/${all.length}`, 'opanowane stolice')}
      ${tile(`${mapsDone}/${D.continents.length}`, 'ułożone kontynenty')}
      ${tile(P.totals.rounds + P.totals.maps, 'rozegrane rundy')}
    </div>
    <h2 class="sec-title">Odznaki <span class="muted">${got} / ${BADGES.length}</span></h2>
    <div class="badge-grid">
      ${BADGES.map((b) => {
        const ts = P.badges[b.id];
        return `<div class="badge ${ts ? '' : 'locked'}">
          <div class="bi">${b.emoji}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>
          ${ts ? `<em>zdobyta ${dateOf(ts)}</em>` : '<em>🔒 do zdobycia</em>'}</div>`;
      }).join('')}
    </div>
    <h2 class="sec-title">Poziomy</h2>
    <div class="levels">
      ${TITLES.map(([emoji, title], i) => {
        const lv = i + 1;
        const cls = lv < L.level ? 'done' : lv === L.level ? 'cur' : '';
        return `<div class="lv ${cls}"><span class="lv-e">${emoji}</span><b>${lv}. ${esc(title)}</b><small>${fmtNum(xpFor(lv))} XP</small></div>`;
      }).join('')}
    </div>
  </div>`;
  el.onclick = (e) => {
    if (e.target.closest('[data-act="back"]')) go('home');
  };
}
