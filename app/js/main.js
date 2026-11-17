// Start aplikacji.

import { loadData } from './data.js';
import { register, go } from './nav.js';
import { unlockAudio } from './fx.js';
import * as home from './ui-home.js';
import * as setup from './ui-setup.js';
import * as quiz from './ui-quiz.js';
import * as maps from './ui-maps.js';
import * as mapgame from './ui-mapgame.js';
import * as atlas from './ui-atlas.js';
import * as badges from './ui-badges.js';

register('home', home);
register('setup', setup);
register('quiz', quiz);
register('maps', maps);
register('mapgame', mapgame);
register('atlas', atlas);
register('badges', badges);

// Wysokość widocznej części ekranu (na iPadzie zmniejsza się, gdy wysunie się klawiatura).
const fullHeight = {};
function syncViewport() {
  const vv = window.visualViewport;
  const hgt = vv ? vv.height : window.innerHeight;
  const orient = window.innerWidth > window.innerHeight ? 'h' : 'v';
  fullHeight[orient] = Math.max(fullHeight[orient] || 0, hgt, window.innerHeight);
  document.documentElement.style.setProperty('--vvh', `${Math.round(hgt)}px`);
  document.body.classList.toggle('kb-open', hgt < fullHeight[orient] - 150);
  if (vv && vv.offsetTop > 0) window.scrollTo(0, 0);
}
if (window.visualViewport) {
  visualViewport.addEventListener('resize', syncViewport);
  visualViewport.addEventListener('scroll', syncViewport);
}
window.addEventListener('resize', syncViewport);
syncViewport();

// Bez przybliżania całej strony gestem (mapa ma własne przybliżanie).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

unlockAudio();

async function boot() {
  try {
    await loadData();
  } catch (e) {
    document.getElementById('boot').innerHTML =
      '<p>Nie udało się wczytać danych. Sprawdź internet i odśwież stronę.</p>';
    return;
  }
  document.getElementById('boot').classList.add('gone');
  setTimeout(() => document.getElementById('boot')?.remove(), 500);
  go('home');
}
boot();

// Praca offline. Lokalnie (podczas tworzenia) tylko z ?sw=1, żeby nie trzymać starych plików.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || location.search.includes('sw=1'))) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
