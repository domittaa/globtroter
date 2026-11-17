// Wczytywanie danych: kraje, mapa świata, mapy kontynentów.

import { collator } from './util.js';

export const REGION_STYLE = {
  world: { emoji: '🌍', color: '#ff5d8f', color2: '#ff9a62' },
  eu: { emoji: '🏰', color: '#4f7cff', color2: '#7aa2ff' },
  as: { emoji: '🐼', color: '#ff9f1c', color2: '#ffc15e' },
  af: { emoji: '🦁', color: '#e8693f', color2: '#f59e6b' },
  na: { emoji: '🦅', color: '#16b5a5', color2: '#4fd6c4' },
  sa: { emoji: '🦜', color: '#5fae35', color2: '#8fd16a' },
  oc: { emoji: '🦘', color: '#9b5cff', color2: '#c29bff' },
};

export const D = {
  countries: [],
  byCode: new Map(),
  continents: [],   // [{id, name}]
  world: null,
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [c, w] = await Promise.all([fetchJSON('data/countries.json'), fetchJSON('data/world.json')]);
  D.continents = c.continents;
  D.countries = c.countries.sort((a, b) => collator.compare(a.name, b.name));
  for (const x of D.countries) D.byCode.set(x.code, x);
  D.world = w;
}

const maps = new Map();
export function loadMap(id) {
  if (!maps.has(id)) maps.set(id, fetchJSON(`data/maps/${id}.json`).catch((e) => { maps.delete(id); throw e; }));
  return maps.get(id);
}

/** Regiony do quizów: cały świat + kontynenty. */
export function regions() {
  return [{ id: 'world', name: 'Cały świat' }, ...D.continents];
}

export function regionName(id) {
  if (id === 'world') return 'Cały świat';
  return D.continents.find((c) => c.id === id)?.name || id;
}

export function countriesIn(region) {
  return region === 'world' ? D.countries : D.countries.filter((c) => c.continents.includes(region));
}

export const country = (code) => D.byCode.get(code);
