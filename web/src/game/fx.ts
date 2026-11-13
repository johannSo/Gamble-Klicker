// Kurze Effekte außerhalb von React (Teil von js/fx.js). Sie laufen in jedem Bild bzw. bei jedem Tipp –
// über DOM-Elemente statt React-Zustand, damit ein schneller Tipper nicht jedes Mal die Liste neu zeichnet.
// Die Partikel (Münzregen, Funken) ziehen in einem späteren Schritt um.
import { getState } from './state.ts';

export function reducedEffects(): boolean {
  if (getState().settings.effects === 'reduced') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function center(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Kurze CSS-Animation über eine Klasse abspielen; die Klasse wird danach wieder entfernt
export function pulse(el: HTMLElement | null | undefined, cls = 'fx-pulse'): void {
  if (!el) return;
  if (el.classList.contains(cls)) {
    el.classList.remove(cls);
    void el.offsetWidth; // Animation neu starten
  }
  el.classList.add(cls);
  const done = (e: AnimationEvent) => {
    if (e.target !== el) return;
    el.classList.remove(cls);
    el.removeEventListener('animationend', done);
    el.removeEventListener('animationcancel', done);
  };
  el.addEventListener('animationend', done);
  el.addEventListener('animationcancel', done);
}

// Schwebender Text an einer Bildschirm-Position (z. B. „⚡ ×2!“ über einem Gebäude)
export function floatText(x: number, y: number, text: string, cls = ''): void {
  const el = document.createElement('div');
  el.className = 'fx-float ' + cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// Schwebender Text bzw. Ring in einer Ebene (Position relativ zur Ebene)
export function layerText(layer: HTMLElement, x: number, y: number, text: string, cls: string, ms: number): void {
  const el = document.createElement('div');
  el.className = 'float-text ' + cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function layerRing(layer: HTMLElement, x: number, y: number): void {
  if (reducedEffects()) return;
  const el = document.createElement('div');
  el.className = 'click-ring';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 500);
}
