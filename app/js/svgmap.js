// Interaktywna mapa SVG: przybliżanie dwoma palcami, przesuwanie, trafianie w kraje.

import { clamp } from './util.js';
import { D, country } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const MAX_ZOOM = 14;

export class MapView {
  /**
   * @param host  element, w którym rysujemy mapę
   * @param map   dane mapy kontynentu
   * @param opts  { labelFor(code), onTap(x, y, hit), onZoom(scale), pad, labelBoost }
   */
  constructor(host, map, opts = {}) {
    this.host = host;
    this.map = map;
    this.opts = opts;
    this.items = new Map();
    this.view = { cx: map.w / 2, cy: map.h / 2, s: 1 };
    this.W = 0;
    this.H = 0;
    this.sFit = 1;
    this.userZoomed = false;
    this.ptrs = new Map();
    this.g = null;
    this.build();
    this.bindGestures();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  build() {
    const { host, map } = this;
    host.classList.add('mapview');
    host.innerHTML = '';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'map-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    const grat = document.createElementNS(NS, 'path');
    grat.setAttribute('class', 'grat');
    grat.setAttribute('d', map.grat || '');
    const gc = document.createElementNS(NS, 'g');
    const gt = document.createElementNS(NS, 'g');
    for (const it of map.items) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', it.d);
      if (it.t) {
        p.setAttribute('class', `tgt k${it.k}`);
        p.dataset.c = it.c;
        gt.appendChild(p);
        this.items.set(it.c, { it, path: p, mk: null, lbl: null, minS: null });
      } else {
        p.setAttribute('class', 'ctx');
        if (it.c) p.dataset.x = it.c;
        gc.appendChild(p);
      }
    }
    svg.append(grat, gc, gt);
    const ov = document.createElement('div');
    ov.className = 'map-ov';
    for (const [code, o] of this.items) {
      if (!o.it.tiny) continue;
      const mk = document.createElement('div');
      mk.className = `mk k${o.it.k}`;
      mk.dataset.c = code;
      ov.appendChild(mk);
      o.mk = mk;
    }
    host.append(svg, ov);
    this.svg = svg;
    this.ov = ov;
  }

  destroy() {
    this.ro.disconnect();
    cancelAnimationFrame(this.animRaf);
    cancelAnimationFrame(this.raf);
    const el = this.host;
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('wheel', this.onWheel);
  }

  // ---------------------------------------------------------- rozmiar i widok

  resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = !this.W;
    this.W = r.width;
    this.H = r.height;
    this.sFit = Math.min(this.W / this.map.w, this.H / this.map.h) * (this.opts.pad || 0.94);
    if (first || !this.userZoomed) this.view = { cx: this.map.w / 2, cy: this.map.h / 2, s: this.sFit };
    for (const o of this.items.values()) o.minS = null;
    this.clampView();
    this.apply(true);
  }

  clampView() {
    const v = this.view;
    v.s = clamp(v.s, this.sFit * 0.8, this.sFit * MAX_ZOOM);
    v.cx = clamp(v.cx, 0, this.map.w);
    v.cy = clamp(v.cy, 0, this.map.h);
  }

  get zoom() {
    return this.view.s / this.sFit;
  }

  apply(full = false) {
    const { cx, cy, s } = this.view;
    const { W, H } = this;
    if (!W) return;
    this.svg.setAttribute('viewBox', `${cx - W / 2 / s} ${cy - H / 2 / s} ${W / s} ${H / s}`);
    for (const o of this.items.values()) this.placeOverlay(o);
    if (full || this.lastS !== s) {
      this.lastS = s;
      for (const o of this.items.values()) if (o.lbl) this.updateLabel(o);
      this.host.classList.toggle('zoomed', s > this.sFit * 1.5);
      this.opts.onZoom && this.opts.onZoom(s / this.sFit);
    }
  }

  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.apply();
    });
  }

  placeOverlay(o) {
    if (!o.mk && !o.lbl) return;
    const { cx, cy, s } = this.view;
    const x = (o.it.lx - cx) * s + this.W / 2;
    const y = (o.it.ly - cy) * s + this.H / 2;
    const t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    if (o.mk) o.mk.style.transform = t;
    if (o.lbl) o.lbl.style.transform = t;
  }

  toMap(x, y) {
    const r = this.host.getBoundingClientRect();
    const { cx, cy, s } = this.view;
    return { x: cx + (x - r.left - this.W / 2) / s, y: cy + (y - r.top - this.H / 2) / s };
  }

  toScreen(mx, my) {
    const r = this.host.getBoundingClientRect();
    const { cx, cy, s } = this.view;
    return { x: r.left + (mx - cx) * s + this.W / 2, y: r.top + (my - cy) * s + this.H / 2 };
  }

  labelPoint(code) {
    const o = this.items.get(code);
    return o ? this.toScreen(o.it.lx, o.it.ly) : null;
  }

  zoomAt(x, y, s) {
    const m = this.toMap(x, y);
    const r = this.host.getBoundingClientRect();
    s = clamp(s, this.sFit * 0.8, this.sFit * MAX_ZOOM);
    this.view = { s, cx: m.x - (x - r.left - this.W / 2) / s, cy: m.y - (y - r.top - this.H / 2) / s };
    this.userZoomed = true;
    this.clampView();
    this.schedule();
  }

  zoomBy(f) {
    this.userZoomed = true;
    this.animateTo({ cx: this.view.cx, cy: this.view.cy, s: this.view.s * f });
  }

  fit(anim = true) {
    this.userZoomed = false;
    const t = { cx: this.map.w / 2, cy: this.map.h / 2, s: this.sFit };
    if (anim) this.animateTo(t);
    else {
      this.view = t;
      this.apply(true);
    }
  }

  zoomTo(code) {
    const o = this.items.get(code);
    if (!o) return;
    // kraj zajmuje mniej więcej 1/5 widoku, żeby było widać sąsiadów
    const bw = Math.max(o.it.lb[0], 10);
    const bh = Math.max(o.it.lb[1], 10);
    const s = clamp(Math.min(this.W / (bw * 5), this.H / (bh * 5)), this.sFit * 1.3, this.sFit * 3.6);
    this.userZoomed = true;
    this.animateTo({ cx: o.it.lx, cy: o.it.ly, s: Math.max(s, this.view.s * 0.999) });
  }

  animateTo(t, ms = 420) {
    const from = { ...this.view };
    const to = { ...t, s: clamp(t.s, this.sFit * 0.8, this.sFit * MAX_ZOOM) };
    const t0 = performance.now();
    cancelAnimationFrame(this.animRaf);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      this.view = {
        cx: from.cx + (to.cx - from.cx) * e,
        cy: from.cy + (to.cy - from.cy) * e,
        s: Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e),
      };
      this.clampView();
      this.apply(k === 1);
      if (k < 1) this.animRaf = requestAnimationFrame(step);
    };
    this.animRaf = requestAnimationFrame(step);
  }

  // ---------------------------------------------------------- podpisy i stany

  showLabel(code, on = true) {
    const o = this.items.get(code);
    if (!o) return;
    if (on && !o.lbl) {
      const l = document.createElement('div');
      l.className = 'lbl' + (o.it.tiny ? ' side' : '');
      const sp = document.createElement('span');
      sp.textContent = this.opts.labelFor ? this.opts.labelFor(code) : code;
      l.appendChild(sp);
      this.ov.appendChild(l);
      o.lbl = l;
      o.minS = null;
      this.placeOverlay(o);
      this.updateLabel(o);
    } else if (!on && o.lbl) {
      o.lbl.remove();
      o.lbl = null;
    }
  }

  updateLabel(o) {
    if (o.minS == null) {
      const sp = o.lbl.firstChild;
      const w = sp.offsetWidth;
      const hgt = sp.offsetHeight;
      if (!w) return;
      // w trybie nauki (labelBoost) nazwy pokazują się przy mniejszym przybliżeniu
      const boost = this.opts.labelBoost ? 0.8 : 1;
      if (o.it.tiny) o.minS = this.sFit * 2.6 * boost * boost;
      else {
        const [bw, bh] = o.it.lb;
        o.minS = boost * Math.max((w * 0.9) / Math.max(bw, 0.5), (hgt * 1.05) / Math.max(bh, 0.5));
      }
    }
    o.lbl.classList.toggle('hide', !o.forceLabel && this.view.s < o.minS * 0.999);
  }

  forceLabel(code, on) {
    const o = this.items.get(code);
    if (!o) return;
    o.forceLabel = on;
    if (o.lbl) this.updateLabel(o);
  }

  setClass(code, cls, on = true) {
    const o = this.items.get(code);
    if (!o) return;
    o.path.classList.toggle(cls, on);
    if (o.mk) o.mk.classList.toggle(cls, on);
  }

  hover(code) {
    if (this.hovered === code) return;
    if (this.hovered) this.setClass(this.hovered, 'hov', false);
    this.hovered = code;
    if (code) this.setClass(code, 'hov', true);
  }

  /** Krótka animacja kraju (klasa CSS z animacją). */
  flash(code, cls, ms = 1000) {
    const o = this.items.get(code);
    if (!o) return;
    this.setClass(code, cls, false);
    void o.path.getBoundingClientRect();
    this.setClass(code, cls, true);
    clearTimeout(o['t_' + cls]);
    o['t_' + cls] = setTimeout(() => this.setClass(code, cls, false), ms);
  }

  flashEl(el, cls, ms = 900) {
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  // ---------------------------------------------------------- trafianie

  /** Co leży pod punktem ekranu: kraj z gry, inny ląd, morze; null = poza mapą. */
  hitAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !this.host.contains(el)) return null;
    const t = el.closest('[data-c]');
    if (t && this.host.contains(t)) return { code: t.dataset.c, kind: 'target', el: t };
    if (el.classList && el.classList.contains('ctx')) return { code: el.dataset.x || null, kind: 'ctx', el };
    return { code: null, kind: 'sea' };
  }

  /** Czy kraj leży w promieniu r pikseli od punktu (próbkowanie wokół). */
  isNear(x, y, code, r) {
    for (const rr of [r * 0.45, r * 0.8, r]) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rr;
        const el = document.elementFromPoint(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        const t = el && el.closest && el.closest('[data-c]');
        if (t && t.dataset.c === code) return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------- gesty

  bindGestures() {
    const el = this.host;
    this.onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(this.animRaf);
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* nic */ }
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 1) {
        this.g = { type: 'tap', x0: e.clientX, y0: e.clientY, cx: this.view.cx, cy: this.view.cy, t0: performance.now() };
      } else if (this.ptrs.size === 2) {
        this.startPinch();
      }
    };
    this.onMove = (e) => {
      const p = this.ptrs.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      const g = this.g;
      if (!g) return;
      if (g.type === 'tap' && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 8) {
        Object.assign(g, { type: 'pan', x0: e.clientX, y0: e.clientY, cx: this.view.cx, cy: this.view.cy });
      }
      if (g.type === 'pan') {
        this.view.cx = g.cx - (e.clientX - g.x0) / this.view.s;
        this.view.cy = g.cy - (e.clientY - g.y0) / this.view.s;
        this.userZoomed = true;
        this.clampView();
        this.schedule();
      } else if (g.type === 'pinch' && this.ptrs.size >= 2) {
        const [a, b] = [...this.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = el.getBoundingClientRect();
        const s = clamp((g.s0 * d) / g.d0, this.sFit * 0.8, this.sFit * MAX_ZOOM);
        this.view = { s, cx: g.mx - (mx - r.left - this.W / 2) / s, cy: g.my - (my - r.top - this.H / 2) / s };
        this.userZoomed = true;
        this.clampView();
        this.schedule();
      }
    };
    this.onUp = (e) => {
      if (!this.ptrs.has(e.pointerId)) return;
      this.ptrs.delete(e.pointerId);
      const g = this.g;
      if (g && g.type === 'tap' && this.ptrs.size === 0 && e.type === 'pointerup' && performance.now() - g.t0 < 700) {
        this.opts.onTap && this.opts.onTap(e.clientX, e.clientY, this.hitAt(e.clientX, e.clientY));
      }
      if (this.ptrs.size === 1) {
        const [p] = [...this.ptrs.values()];
        this.g = { type: 'pan', x0: p.x, y0: p.y, cx: this.view.cx, cy: this.view.cy };
      } else if (this.ptrs.size === 0) {
        this.g = null;
        this.apply(true);
      }
    };
    this.onWheel = (e) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022));
      this.zoomAt(e.clientX, e.clientY, this.view.s * f);
    };
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  startPinch() {
    const [a, b] = [...this.ptrs.values()];
    const m = this.toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.g = { type: 'pinch', d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), s0: this.view.s, mx: m.x, my: m.y };
  }
}

// ------------------------------------------------------------ statyczne miniatury

/** Miniatura kontynentu (kształt mapy z gry). */
export function thumbSVG(id, cls = '') {
  const th = D.world.thumbs[id];
  const fade = (n, x2, y2) => `<linearGradient id="${n}-${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="#000"/><stop offset=".07" stop-color="#fff"/>
      <stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="m${n}-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${th.w}" height="${th.h}">
      <rect width="${th.w}" height="${th.h}" fill="url(#${n}-${id})"/></mask>`;
  // krawędzie kadru (np. przycięta Rosja) łagodnie zanikają
  return `<svg class="thumb ${cls}" viewBox="0 0 ${th.w} ${th.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>${fade('fx', 1, 0)}${fade('fy', 0, 1)}</defs>
    <g mask="url(#mfx-${id})"><g mask="url(#mfy-${id})">
      <path class="th-x" d="${th.x}"/><path class="th-t" d="${th.t}"/></g></g></svg>`;
}

/**
 * Mapa świata. region: podświetl kontynent; focus: przybliż i zaznacz kraj.
 */
export function worldSVG({ region = null, focus = null, cls = '' } = {}) {
  const w = D.world;
  let vb = `0 0 ${w.w} ${w.h}`;
  let extra = '';
  const paths = [];
  let focusItem = null;
  for (const it of w.items) {
    let c = 'w-land';
    if (it.c) {
      if (focus && it.c === focus) {
        c = 'w-focus';
        focusItem = it;
      } else if (region && (region === 'world' || country(it.c)?.continents.includes(region))) c = 'w-region';
    }
    if (it.d) paths.push(`<path class="${c}" d="${it.d}"/>`);
  }
  if (focusItem) {
    const [x0, y0, x1, y1] = focusItem.bb;
    const bw = x1 - x0, bh = y1 - y0;
    const vw = clamp(Math.max(bw * 3.2, bh * 3.2 * 2, 160), 160, w.w);
    const vh = vw / 2;
    const cx = clamp(focusItem.lx, vw / 2, w.w - vw / 2);
    const cy = clamp(focusItem.ly, vh / 2, Math.max(vh / 2, w.h - vh / 2));
    vb = `${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
    if (Math.max(bw, bh) < vw * 0.035) {
      extra = `<circle class="w-ring" cx="${focusItem.lx}" cy="${focusItem.ly}" r="${(vw * 0.035).toFixed(1)}"/>`;
    }
    // zaznaczony kraj na wierzchu
    const i = paths.findIndex((p) => p.startsWith('<path class="w-focus"'));
    if (i >= 0) paths.push(paths.splice(i, 1)[0]);
  }
  return `<svg class="world ${cls}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${paths.join('')}${extra}</svg>`;
}
