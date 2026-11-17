// Postępy gracza: punkty, poziomy, opanowane kraje, odznaki. Zapis w localStorage.

import { todayKey } from './util.js';
import { D } from './data.js';

const KEY = 'globtroter.v1';

function fresh() {
  return {
    xp: 0,
    stats: { flags: {}, capitals: {}, map: {} },   // kod -> {lvl, ok, bad, last}
    maps: {},                                       // kontynent -> {stars, time, score, plays, perfect}
    badges: {},                                     // id -> znacznik czasu
    bestStreak: 0,
    day: { last: null, streak: 0, best: 0 },
    totals: { answers: 0, correct: 0, rounds: 0, maps: 0 },
    settings: { sound: true, answerMode: 'type', count: 10, suggest: true },
    mapSaves: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw);
    const f = fresh();
    return { ...f, ...p, stats: { ...f.stats, ...p.stats }, totals: { ...f.totals, ...p.totals },
      settings: { ...f.settings, ...p.settings }, day: { ...f.day, ...p.day } };
  } catch (e) {
    return fresh();
  }
}

export const P = load();

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* brak miejsca lub tryb prywatny */ }
  }, 150);
}
window.addEventListener('pagehide', () => {
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* nic */ }
});

export function resetProgress() {
  const keep = P.settings;
  Object.keys(P).forEach((k) => delete P[k]);
  Object.assign(P, fresh(), { settings: keep });
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* nic */ }
}

// ------------------------------------------------------------ poziomy

export const TITLES = [
  ['🎒', 'Turysta'], ['🥾', 'Wędrowiec'], ['🧭', 'Podróżnik'], ['🔭', 'Odkrywca'],
  ['⛵', 'Żeglarz'], ['🧳', 'Obieżyświat'], ['🗺️', 'Kartograf'], ['✈️', 'Pilot'],
  ['🎖️', 'Ambasador'], ['🌍', 'Globtroter'], ['🏆', 'Mistrz geografii'], ['👑', 'Legenda świata'],
];

export const xpFor = (L) => 75 * (L - 1) * (L + 2);

export function levelInfo(xp = P.xp) {
  let L = 1;
  while (xpFor(L + 1) <= xp) L++;
  const cur = xpFor(L), next = xpFor(L + 1);
  const [emoji, title] = TITLES[Math.min(L, TITLES.length) - 1];
  return { level: L, emoji, title, into: xp - cur, need: next - cur, progress: (xp - cur) / (next - cur) };
}

/** Dodaje punkty; zwraca nowy poziom, jeśli właśnie wskoczył. */
export function addXP(n) {
  const before = levelInfo().level;
  P.xp += Math.max(0, Math.round(n));
  save();
  const after = levelInfo();
  return after.level > before ? after : null;
}

// ------------------------------------------------------------ opanowanie krajów

export function itemStat(mode, code) {
  return P.stats[mode][code] || { lvl: 0, ok: 0, bad: 0, last: 0 };
}

/** lvl 0-3. Ostatnią (trzecią) gwiazdkę daje tylko odpowiedź wpisana z pamięci. */
export function recordAnswer(mode, code, correct, strong = true) {
  const s = { ...itemStat(mode, code) };
  if (correct) {
    s.ok++;
    if (s.lvl < 3) s.lvl = strong ? s.lvl + 1 : Math.min(2, s.lvl + 1);
  } else {
    s.bad++;
    s.lvl = Math.max(0, s.lvl - 1);
  }
  s.last = Date.now();
  s.lastOk = correct;
  P.stats[mode][code] = s;
  if (mode !== 'map') {
    P.totals.answers++;
    if (correct) P.totals.correct++;
  }
  touchDay();
  save();
}

export const isMastered = (mode, code) => itemStat(mode, code).lvl >= 3;

export function masteredCount(mode, codes) {
  return codes.reduce((n, c) => n + (isMastered(mode, c) ? 1 : 0), 0);
}

/** Kolejność pytań: najpierw nieopanowane i ostatnio pomylone, z dozą losowości. */
export function pickItems(mode, codes, n) {
  const scored = codes.map((code) => {
    const s = itemStat(mode, code);
    let w = Math.random() * 1.6 + (3 - s.lvl);
    if (s.lastOk === false) w += 1.2;
    return { code, w };
  });
  scored.sort((a, b) => b.w - a.w);
  return scored.slice(0, n).map((x) => x.code);
}

// ------------------------------------------------------------ seria dni

export function touchDay() {
  const today = todayKey();
  if (P.day.last === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  P.day.streak = P.day.last === todayKey(y) ? P.day.streak + 1 : 1;
  P.day.last = today;
  P.day.best = Math.max(P.day.best, P.day.streak);
}

export function dayStreak() {
  if (!P.day.last) return 0;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return P.day.last === todayKey() || P.day.last === todayKey(y) ? P.day.streak : 0;
}

// ------------------------------------------------------------ mapy

export function recordMap(cont, { stars, time, score, perfect }) {
  const m = P.maps[cont] || { stars: 0, time: 0, score: 0, plays: 0, perfect: false };
  const isBestTime = !m.time || time < m.time;
  P.maps[cont] = {
    stars: Math.max(m.stars, stars),
    time: isBestTime ? time : m.time,
    score: Math.max(m.score, score),
    plays: m.plays + 1,
    perfect: m.perfect || perfect,
  };
  P.totals.maps++;
  touchDay();
  save();
  return { isBestTime: isBestTime && m.plays > 0, prev: m };
}

// ------------------------------------------------------------ odznaki

export const BADGES = [
  { id: 'first', emoji: '👣', name: 'Pierwszy krok', desc: 'Pierwsza poprawna odpowiedź' },
  { id: 'streak10', emoji: '🔥', name: 'Gorąca seria', desc: '10 poprawnych odpowiedzi z rzędu' },
  { id: 'streak25', emoji: '☄️', name: 'Niepowstrzymany', desc: '25 poprawnych odpowiedzi z rzędu' },
  { id: 'streak50', emoji: '🚀', name: 'Rakieta', desc: '50 poprawnych odpowiedzi z rzędu' },
  { id: 'perfect', emoji: '💎', name: 'Perfekcja', desc: 'Runda (min. 10 pytań) bez żadnego błędu' },
  { id: 'speed', emoji: '⚡', name: 'Błyskawica', desc: '5 poprawnych odpowiedzi z rzędu, każda w mniej niż 4 sekundy' },
  { id: 'nohint', emoji: '🧠', name: 'Bez ściągania', desc: 'Runda 20 pytań z wpisywaniem, bez podpowiedzi, min. 90%' },
  { id: 'flags25', emoji: '🏳️', name: 'Znawca flag', desc: 'Opanuj 25 flag' },
  { id: 'flags100', emoji: '🎌', name: 'Weksylolog', desc: 'Opanuj 100 flag' },
  { id: 'flagsAll', emoji: '🏆', name: 'Mistrz flag', desc: 'Opanuj wszystkie flagi' },
  { id: 'caps25', emoji: '🏙️', name: 'Bywalec stolic', desc: 'Opanuj 25 stolic' },
  { id: 'caps100', emoji: '🎖️', name: 'Ambasador', desc: 'Opanuj 100 stolic' },
  { id: 'capsAll', emoji: '👑', name: 'Mistrz stolic', desc: 'Opanuj wszystkie stolice' },
  { id: 'map1', emoji: '🗺️', name: 'Kartograf', desc: 'Ułóż mapę pierwszego kontynentu' },
  { id: 'mapPerfect', emoji: '🎯', name: 'Snajper', desc: 'Ułóż cały kontynent bez żadnego błędu' },
  { id: 'mapAll', emoji: '🌍', name: 'Zdobywca świata', desc: 'Ułóż mapy wszystkich kontynentów' },
  { id: 'map3All', emoji: '🌟', name: 'Złoty glob', desc: '3 gwiazdki na każdym kontynencie' },
  { id: 'euroFast', emoji: '🚄', name: 'Ekspres przez Europę', desc: 'Ułóż mapę Europy w mniej niż 4 minuty' },
  { id: 'day3', emoji: '📅', name: 'Systematyczność', desc: 'Graj 3 dni z rzędu' },
  { id: 'day7', emoji: '🗓️', name: 'Tydzień z geografią', desc: 'Graj 7 dni z rzędu' },
  { id: 'xp1k', emoji: '⭐', name: 'Tysiąc punktów', desc: 'Zdobądź 1000 XP' },
  { id: 'xp10k', emoji: '🌠', name: 'Legenda', desc: 'Zdobądź 10 000 XP' },
];

/**
 * Sprawdza odznaki po zdarzeniu. ev: {streak, perfectRound, speedRun, noHintRound, mapDone}
 * Zwraca listę nowo zdobytych.
 */
export function checkBadges(ev = {}) {
  const all = D.countries.map((c) => c.code);
  const flags = masteredCount('flags', all);
  const caps = masteredCount('capitals', all);
  const conts = D.continents.map((c) => c.id);
  const done = conts.filter((c) => P.maps[c]);
  const cond = {
    first: P.totals.correct >= 1,
    streak10: (ev.streak || 0) >= 10 || P.bestStreak >= 10,
    streak25: (ev.streak || 0) >= 25 || P.bestStreak >= 25,
    streak50: (ev.streak || 0) >= 50 || P.bestStreak >= 50,
    perfect: !!ev.perfectRound,
    speed: !!ev.speedRun,
    nohint: !!ev.noHintRound,
    flags25: flags >= 25,
    flags100: flags >= 100,
    flagsAll: flags >= all.length,
    caps25: caps >= 25,
    caps100: caps >= 100,
    capsAll: caps >= all.length,
    map1: done.length >= 1,
    mapPerfect: conts.some((c) => P.maps[c]?.perfect),
    mapAll: done.length === conts.length,
    map3All: conts.every((c) => (P.maps[c]?.stars || 0) >= 3),
    euroFast: !!(ev.mapDone && ev.mapDone.cont === 'eu' && ev.mapDone.time < 240),
    day3: P.day.streak >= 3,
    day7: P.day.streak >= 7,
    xp1k: P.xp >= 1000,
    xp10k: P.xp >= 10000,
  };
  const won = [];
  for (const b of BADGES) {
    if (!P.badges[b.id] && cond[b.id]) {
      P.badges[b.id] = Date.now();
      won.push(b);
    }
  }
  if (won.length) save();
  return won;
}

export function noteStreak(streak) {
  if (streak > P.bestStreak) {
    P.bestStreak = streak;
    save();
  }
}
