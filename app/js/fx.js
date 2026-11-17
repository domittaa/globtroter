// Efekty: dźwięki (syntezowane, bez plików), konfetti, dymki z punktami, powiadomienia, okna.

import { P } from './store.js';
import { h, esc } from './util.js';

// ------------------------------------------------------------ dźwięk

let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** iPad pozwala grać dopiero po pierwszym dotknięciu. */
export function unlockAudio() {
  const evs = ['pointerdown', 'touchend', 'click'];
  const once = () => {
    const c = ac();
    if (c && c.state === 'running') evs.forEach((t) => window.removeEventListener(t, once, true));
  };
  evs.forEach((t) => window.addEventListener(t, once, true));
}

function tone(freq, t0, dur, { type = 'sine', gain = 0.2, to = null, filter = null } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + t0;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    o.connect(f);
    node = f;
  }
  node.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const play = (fn) => () => { if (P.settings.sound) try { fn(); } catch (e) { /* bez dźwięku */ } };

export const sfx = {
  good: play(() => {
    tone(784, 0, 0.14, { type: 'triangle', gain: 0.22 });
    tone(1175, 0.075, 0.26, { type: 'triangle', gain: 0.2 });
  }),
  combo: play(() => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.2, { type: 'triangle', gain: 0.16 }));
  }),
  bad: play(() => {
    tone(220, 0, 0.18, { type: 'sawtooth', gain: 0.09, to: 160, filter: 900 });
    tone(165, 0.13, 0.26, { type: 'sawtooth', gain: 0.08, to: 110, filter: 700 });
  }),
  pick: play(() => tone(520, 0, 0.07, { type: 'sine', gain: 0.12, to: 780 })),
  drop: play(() => tone(400, 0, 0.1, { type: 'sine', gain: 0.1, to: 260 })),
  place: play(() => {
    tone(660, 0, 0.09, { type: 'sine', gain: 0.18, to: 990 });
    tone(1320, 0.07, 0.25, { type: 'triangle', gain: 0.14 });
  }),
  hint: play(() => {
    tone(880, 0, 0.12, { type: 'sine', gain: 0.12 });
    tone(660, 0.1, 0.18, { type: 'sine', gain: 0.1 });
  }),
  win: play(() => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, { type: 'triangle', gain: 0.2 }));
    tone(1047, 0.46, 0.7, { type: 'sine', gain: 0.14 });
    tone(1319, 0.46, 0.7, { type: 'sine', gain: 0.1 });
  }),
  level: play(() => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.25, { type: 'triangle', gain: 0.16 }));
  }),
  badge: play(() => {
    tone(1047, 0, 0.18, { type: 'sine', gain: 0.16 });
    tone(1568, 0.12, 0.4, { type: 'sine', gain: 0.13 });
  }),
  tick: play(() => tone(1500, 0, 0.03, { type: 'square', gain: 0.025 })),
};

// ------------------------------------------------------------ konfetti

const COLORS = ['#ff5d8f', '#ffc23d', '#4f7cff', '#1fc8a1', '#9b5cff', '#ff8a3d', '#5fd0ff'];
let parts = [];
let raf = 0;
let cv, c2d;

function ensureCanvas() {
  if (cv) return;
  cv = document.getElementById('confetti');
  c2d = cv.getContext('2d');
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Konfetti z góry ekranu albo wybuch z punktu {x, y}. */
export function confetti({ x = null, y = null, count = 140, spread = 1 } = {}) {
  ensureCanvas();
  resize();
  for (let i = 0; i < count; i++) {
    const burst = x !== null;
    const a = burst ? Math.random() * Math.PI * 2 : Math.PI / 2 + (Math.random() - 0.5) * 0.9;
    const sp = burst ? (3 + Math.random() * 7) * spread : 2 + Math.random() * 5;
    parts.push({
      x: burst ? x : Math.random() * innerWidth,
      y: burst ? y : -20 - Math.random() * innerHeight * 0.3,
      vx: Math.cos(a) * sp * (burst ? 1 : 0.6),
      vy: burst ? Math.sin(a) * sp - 3 : Math.sin(a) * sp,
      r: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() < 0.3 ? 1 : 0,
      life: burst ? 70 + Math.random() * 30 : 200,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 30);
  for (const p of parts) {
    p.vy += 0.16;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life--;
    c2d.save();
    c2d.globalAlpha = Math.min(1, p.life / 30);
    c2d.translate(p.x, p.y);
    c2d.rotate(p.rot);
    c2d.fillStyle = p.c;
    if (p.shape) {
      c2d.beginPath();
      c2d.arc(0, 0, p.r * 0.55, 0, Math.PI * 2);
      c2d.fill();
    } else {
      c2d.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    }
    c2d.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) c2d.clearRect(0, 0, innerWidth, innerHeight);
}

// ------------------------------------------------------------ dymek z punktami

export function floatText(text, x, y, cls = '') {
  const el = h(`<div class="float-text ${cls}">${esc(text)}</div>`);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ------------------------------------------------------------ powiadomienia

export function toast(html, { kind = '', ms = 2600 } = {}) {
  const root = document.getElementById('toasts');
  const el = h(`<div class="toast ${kind}">${html}</div>`);
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, ms);
  return el;
}

export function announceBadges(list) {
  list.forEach((b, i) => {
    setTimeout(() => {
      sfx.badge();
      toast(`<span class="t-emoji">${b.emoji}</span><span><small>Nowa odznaka!</small><b>${esc(b.name)}</b></span>`,
        { kind: 'badge', ms: 3400 });
    }, 500 + i * 900);
  });
}

export function announceLevel(info) {
  if (!info) return;
  setTimeout(() => {
    sfx.level();
    confetti({ count: 90 });
    toast(`<span class="t-emoji">${info.emoji}</span><span><small>Awans na poziom ${info.level}!</small><b>${esc(info.title)}</b></span>`,
      { kind: 'level', ms: 3600 });
  }, 250);
}

// ------------------------------------------------------------ okna

/** Pokazuje okno. Zwraca {el, close}. Przyciski z data-close zamykają okno. */
export function modal(inner, { cls = '', dismissable = true, onClose = null } = {}) {
  const root = document.getElementById('modal-root');
  const wrap = h(`<div class="modal-wrap"><div class="modal ${cls}">${inner}</div></div>`);
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));
  let closed = false;
  const close = (val) => {
    if (closed) return;
    closed = true;
    wrap.classList.remove('in');
    setTimeout(() => wrap.remove(), 250);
    onClose && onClose(val);
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-close]');
    if (b) close(b.dataset.close);
    else if (dismissable && e.target === wrap) close(null);
  });
  return { el: wrap.querySelector('.modal'), close };
}

export function confirmBox(title, text, okLabel = 'Tak', cancelLabel = 'Anuluj', danger = false) {
  return new Promise((resolve) => {
    modal(`
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn ghost" data-close="no">${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-close="yes">${esc(okLabel)}</button>
      </div>`, { cls: 'small', onClose: (v) => resolve(v === 'yes') });
  });
}
