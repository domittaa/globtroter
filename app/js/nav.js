// Przełączanie ekranów.

const screens = {};
let current = null;

export function register(name, mod) {
  screens[name] = mod;
}

export function go(name, params = {}) {
  if (current && screens[current].leave) screens[current].leave();
  for (const s of document.querySelectorAll('.screen')) {
    const on = s.id === name;
    s.classList.toggle('hidden', !on);
    if (on) {
      s.classList.remove('enter');
      void s.offsetWidth;
      s.classList.add('enter');
    }
  }
  current = name;
  window.scrollTo(0, 0);
  screens[name].enter(document.getElementById(name), params);
}

export const currentScreen = () => current;
