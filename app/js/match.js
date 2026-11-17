// Sprawdzanie wpisanych odpowiedzi: bez wielkości liter i polskich znaków, z tolerancją literówek.

export function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' i ')
    .replace(/[’'`ʻʼ]/g, '')
    .replace(/\bst\b\.?/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\band\b/g, 'i')
    .trim();
}

/**
 * Normalizacja znak po znaku (jak norm, bez zamiany "st" na "saint") razem z mapą:
 * map[i] = pozycja w oryginale znaku s[i]. Służy do podpowiedzi i pogrubiania pasującej części.
 */
export function normMap(str) {
  let s = '';
  const map = [];
  for (let i = 0; i < str.length; i++) {
    let c = str[i].toLowerCase().replace('ł', 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/[’'`ʻʼ]/.test(c)) c = '';
    else if (!/^[a-z0-9]*$/.test(c)) c = ' ';
    for (const ch of c) {
      if (ch === ' ' && (s === '' || s.endsWith(' '))) continue;
      s += ch;
      map.push(i);
    }
  }
  if (s.endsWith(' ')) {
    s = s.slice(0, -1);
    map.pop();
  }
  return { s, map };
}

/** Odległość edycyjna; zamiana dwóch sąsiednich liter liczy się jako jeden błąd. */
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let pp = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    pp = prev;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : len <= 11 ? 2 : 3);

/**
 * items: [{code, answers: [..]}]. Zwraca funkcję check(input, code) ->
 *   {result: 'exact' | 'typo' | 'other' | 'wrong' | 'empty', other?: code}
 */
export function makeMatcher(items) {
  const all = items.map((it) => ({ code: it.code, norms: [...new Set(it.answers.map(norm))].filter(Boolean) }));
  const byCode = new Map(all.map((a) => [a.code, a]));

  return function check(input, code) {
    const n = norm(input);
    if (!n) return { result: 'empty' };
    const me = byCode.get(code);
    if (me.norms.includes(n)) return { result: 'exact' };
    for (const a of all) {
      if (a.code !== code && a.norms.includes(n)) return { result: 'other', other: a.code };
    }
    let best = Infinity, bestT = '';
    for (const t of me.norms) {
      const d = lev(n, t, 3);
      if (d < best) { best = d; bestT = t; }
    }
    if (best > allowedTypos(bestT.length)) return { result: 'wrong' };
    // literówka nie może być bliżej innej odpowiedzi (np. Austria / Australia)
    for (const a of all) {
      if (a.code === code) continue;
      for (const t of a.norms) if (lev(n, t, best) <= best) return { result: 'wrong' };
    }
    return { result: 'typo' };
  };
}
