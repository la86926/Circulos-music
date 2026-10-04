/* Círculos Music · tutorial guiado
   - Una mano animada enseña qué tocar o deslizar; el botón señalado "salta" suavemente.
   - Se puede cerrar en cualquier momento (X, "Ahora no" o la tecla Esc).
   - Se muestra solo la primera vez; después se repite con el botón "?" o desde el menú.
   - Funciona en index.html (Círculos) y en acordes.html (Biblioteca). */
(() => {
'use strict';
if (window.__circulosTutorial) return;
window.__circulosTutorial = true;

const PAGE = document.getElementById('circlesView') ? 'circulos'
           : document.getElementById('chordsView') ? 'acordes' : null;
if (!PAGE) return;

/* ───────── Ajustes ───────── */
const SHOW_EVERY_VISIT = false;               // true = aparece en cada visita (por defecto solo la primera vez)
const STORAGE_KEY = `circulos-tutorial-${PAGE}`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ───────── Iconos ───────── */
const ICON = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  help:  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.4a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4.2"/><path d="M12 17.7v.1"/></svg>',
  hand:  '<svg viewBox="-3 -2 60 68" aria-hidden="true"><defs><g id="tutoHandShapes"><rect x="12" y="3" width="12" height="36" rx="6"/><rect x="23" y="22" width="11" height="26" rx="5.5"/><rect x="33" y="25" width="10.5" height="24" rx="5.25"/><rect x="42.5" y="29" width="9" height="20" rx="4.5"/><rect x="12" y="32" width="39.5" height="29" rx="13"/><rect x="3" y="34" width="12" height="25" rx="6" transform="rotate(-24 9 46)"/></g></defs><g fill="#171817" stroke="#171817" stroke-width="4" stroke-linejoin="round"><use href="#tutoHandShapes"/></g><g fill="#fff"><use href="#tutoHandShapes"/></g><path d="M23.5 30v8M33.5 32v7M42.5 35v6" fill="none" stroke="#171817" stroke-opacity=".38" stroke-width="1.6" stroke-linecap="round"/></svg>'
};

/* ───────── Utilidades ───────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const shown = el => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
};
const onScreenX = el => { const r = el.getBoundingClientRect(); return r.right > 4 && r.left < innerWidth - 4; };
const pick    = q => typeof q === 'function' ? q() : (q ? $$(q).find(shown) || null : null);
const pickAll = q => typeof q === 'function' ? (q() || []) : (q ? $$(q).filter(shown) : []);
const inFixed = el => { for (let n = el; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
const isDone  = () => { try { return localStorage.getItem(STORAGE_KEY) === 'done'; } catch (e) { return false; } };
const saveDone = () => { try { localStorage.setItem(STORAGE_KEY, 'done'); } catch (e) {} };

/* ───────── Pasos ─────────
   modal   : tarjeta centrada, sin elemento enfocado
   ring    : elemento que se enfoca            hop : botones que saltan
   at      : dónde toca el dedo                gesture : tap | swipe | swipey
   tap     : { sel, ev } acción real del usuario que da el paso por bueno (avanza solo)
   variant : función que ajusta el paso según lo que haya en pantalla */
const tonePick = () => {
  const list = pickAll('#toneSelector .tone-btn:not(.active)').filter(onScreenX)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  return list[Math.min(2, list.length - 1)] || null;
};
const rootPick = () => {
  const list = pickAll('#chordRootFilters button:not(.active)').filter(onScreenX)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  return list[Math.min(2, list.length - 1)] || null;
};
const scrolls = sel => { const el = $(sel); return !!el && el.scrollWidth > el.clientWidth + 6; };
const menuOpen  = () => { if (!$('#sideMenu.open')) $('#menuBtn')?.click(); };
const menuClose = () => { if ($('#sideMenu.open')) $('#menuCloseBtn')?.click(); };

const STEPS = {
  circulos: [
    { modal: true, title: 'Bienvenido a Círculos Music',
      text: 'Elige una tonalidad y descubre sus 7 acordes, con su forma en guitarra y en piano. Te lo muestro en menos de un minuto.',
      next: 'Empezar', skip: 'Ahora no', at: '#tutoNext', gesture: 'tap' },

    { title: '¿Cómo quieres ver las notas?',
      text: 'Inglés usa letras (C, D, E) y Latina usa nombres (DO, RE, MI). Toca la que prefieras.',
      ring: '#circlesView .toolbar .control-card:first-child .segmented', radius: 22,
      hop: '#circlesView [data-nomenclature]', at: '#circlesView [data-nomenclature]:not(.active)',
      tap: { sel: '[data-nomenclature]' }, ok: '¡Listo, cambiado!' },

    { title: 'Elige la tonalidad', ring: '#toneSelector', radius: 20, pad: 3, hop: '#toneSelector .tone-btn',
      tap: { sel: '.tone-btn' }, ok: '¡Esa es tu tónica!',
      variant() {
        const swipe = scrolls('#toneSelector');
        return { gesture: swipe ? 'swipe' : 'tap', at: swipe ? '#toneSelector' : tonePick,
          text: swipe ? 'Desliza para recorrerlas y toca la nota que quieras: será la tónica de la escala.'
                      : 'Toca la nota que quieras: será la tónica de la escala.' };
      } },

    { title: 'Mayor o menor',
      text: 'Cambia entre escala mayor y menor natural. Los 7 acordes se recalculan al instante.',
      ring: '.minimal-scale-control', radius: 14, hop: '.minimal-scale-control', hopY: '-5px',
      at: '#minimalScaleSelect', tap: { sel: '#minimalScaleSelect', ev: 'change' }, ok: '¡Escala cambiada!' },

    { title: 'Los 7 acordes de la tonalidad',
      text: 'En el centro está la tónica y alrededor los otros seis. Verde = mayor, azul = menor, naranja punteado = disminuido. Toca uno.',
      ring: '#circuloArmonico .harmony-wheel-stage', radius: 28, pad: 4,
      hop: '#circuloArmonico .harmony-wheel-node', hopY: '-16px',
      at: '#circuloArmonico .harmony-wheel-node[data-wheel-index="4"]',
      tap: { sel: '.harmony-wheel-node' }, ok: '¡Ese es tu acorde!' },

    { title: 'Guitarra o piano', text: 'Mira el mismo acorde en el instrumento que tocas.',
      ring: '#instrumento .instrument-tabs .segmented', radius: 22,
      hop: '#instrumento .instrument-tabs .seg-btn', at: '#instrumento .instrument-tabs .seg-btn:not(.active)',
      tap: { sel: '#instrumento .instrument-tabs .seg-btn' }, ok: '¡Instrumento cambiado!' },

    { variant() {
        if (pick('#guitarVoicings')) return {
          title: 'Posiciones en guitarra',
          text: 'Desliza hacia los lados para ver más formas de tocarlo: abiertas, con cejilla y tríadas. La R marca la nota tónica.',
          ring: '#guitarVoicings', radius: 22, hop: '#guitarVoicings .voicing-card', gesture: 'swipe', at: '#guitarVoicings' };
        return {
          title: 'Posiciones en piano',
          text: 'Las teclas de color son las notas del acorde. Prueba las inversiones para ver otras formas de tocarlo.',
          ring: '#pianoPanel', radius: 22, hop: '#pianoPanel [data-inversion]', gesture: 'tap',
          at: '#pianoPanel [data-inversion]:not(.active)', tap: { sel: '#pianoPanel [data-inversion]' }, ok: '¡Otra forma de tocarlo!' };
      } },

    { title: 'Claro, oscuro o automático', text: 'Cambia la apariencia a tu gusto; el sitio la recuerda.',
      ring: '.theme-switch', radius: 16, pad: 5, hop: '.theme-choice', hopY: '-5px',
      at: '.theme-choice:not(.active)', tap: { sel: '.theme-choice' }, ok: '¡Apariencia cambiada!' },

    { title: 'Más herramientas',
      text: 'En el menú está la biblioteca de Acordes: más de 900 acordes de guitarra con todas sus posiciones.',
      ring: '.app-choice[href="acordes.html"]', radius: 20, hop: '.app-choice[href="acordes.html"]', hopY: '-5px',
      at: '.app-choice[href="acordes.html"]', onEnter: menuOpen, onExit: menuClose },

    { modal: true, title: '¡Listo para tocar!',
      text: 'Cuando quieras repetir esta guía, toca el botón “?” o búscala en el menú.',
      next: 'Terminar', keepFab: true, at: '.tuto-fab', hop: '.tuto-fab', hopY: '-6px', gesture: 'tap' }
  ],

  acordes: [
    { modal: true, title: 'Biblioteca de acordes',
      text: 'Encuentra cualquier acorde de guitarra y ábrelo para ver todas sus posiciones. Te enseño cómo filtrar rápido.',
      next: 'Empezar', skip: 'Ahora no', at: '#tutoNext', gesture: 'tap' },

    { title: 'Busca por nombre',
      text: 'Toca aquí y escribe, por ejemplo, Cmaj7, DO menor 7 o F#m7. Entiende nombres en español y en inglés.',
      ring: '.chord-search', radius: 20, hop: '.chord-search', hopY: '-4px', at: '#chordSearch',
      tap: { sel: '#chordSearch', ev: 'input' }, ok: '¡Perfecto!' },

    { title: 'Latina o inglesa', text: 'Cambia entre DO, RE, MI y C, D, E.',
      ring: '.chord-notation .segmented', radius: 22, hop: '[data-library-notation]',
      at: '[data-library-notation]:not(.active)', tap: { sel: '[data-library-notation]' }, ok: '¡Cambiado!' },

    { title: 'Filtra por nota', ring: '#chordRootFilters', radius: 22, pad: 4,
      hop: '#chordRootFilters button', tap: { sel: '#chordRootFilters button' }, ok: '¡Filtrado!',
      variant() {
        const swipe = scrolls('#chordRootFilters');
        return { gesture: swipe ? 'swipe' : 'tap', at: swipe ? '#chordRootFilters' : rootPick,
          text: swipe ? 'Toca una nota para ver solo sus acordes. Desliza para ver todas.'
                      : 'Toca una nota para ver solo sus acordes.' };
      } },

    { title: 'Familia y posición',
      text: 'Elige la familia (mayor, menor, séptimas…). Más abajo también puedes filtrar por posición: abiertas, cejilla o inversiones.',
      ring: () => $('#chordFamilyFilter')?.closest('label'), radius: 20, hop: '#chordFamilyFilter', hopY: '-4px',
      at: '#chordFamilyFilter', tap: { sel: '#chordFamilyFilter', ev: 'change' }, ok: '¡Filtrado!' },

    { title: 'Abre un acorde', text: 'Toca una tarjeta para ver todas sus posiciones en el diapasón.',
      ring: '.chord-catalog-card', radius: 24, hop: '.chord-catalog-card', hopY: '-6px',
      at: '.chord-catalog-card', tap: { sel: '.chord-catalog-card' }, ok: '¡Ahí están!' },

    { title: 'Todas las posiciones',
      text: 'Cada tarjeta es una forma distinta de tocarlo. Desliza hacia abajo para ver todas: abiertas, con cejilla e inversiones.',
      ring: '#chordDetail .chord-position-card', radius: 22, hop: '#chordDetail .chord-position-card',
      gesture: 'swipey', at: '#chordDetail .chord-position-card',
      onEnter() { if (!$('#chordDetail.open')) $('.chord-catalog-card')?.click(); },
      onExit()  { if ($('#chordDetail.open')) $('#chordDetail [data-detail-close]')?.click(); } },

    { title: 'Más herramientas',
      text: 'Desde el menú vuelves a los Círculos, para ver los 7 acordes de cada tonalidad.',
      ring: '.app-choice[href="index.html"]', radius: 20, hop: '.app-choice[href="index.html"]', hopY: '-5px',
      at: '.app-choice[href="index.html"]', onEnter: menuOpen, onExit: menuClose },

    { modal: true, title: '¡Listo para buscar!',
      text: 'Cuando quieras repetir esta guía, toca el botón “?” o búscala en el menú.',
      next: 'Terminar', keepFab: true, at: '.tuto-fab', hop: '.tuto-fab', hopY: '-6px', gesture: 'tap' }
  ]
};

/* ───────── Estado ───────── */
let layer, ringEl, handEl, cardEl, kickerEl, titleEl, textEl, okEl, dotsEl, prevBtn, nextBtn, fab;
let steps = [], idx = -1, cur = null, active = false, raf = 0, token = 0, succeeded = false, movingTimer = 0;
const hopped = new Set();

/* ───────── Construcción de la interfaz ───────── */
function build() {
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'tuto-layer';
  layer.hidden = true;
  layer.innerHTML =
    '<div class="tuto-dim"></div>' +
    '<div class="tuto-ring"></div>' +
    `<div class="tuto-hand" aria-hidden="true"><div class="tuto-hand-in">${ICON.hand}</div><span class="tuto-ripple"></span></div>` +
    '<section class="tuto-card" role="dialog" aria-label="Tutorial" aria-live="polite">' +
      `<button class="tuto-x" type="button" aria-label="Cerrar tutorial" title="Cerrar tutorial">${ICON.close}</button>` +
      '<img class="tuto-mark" src="logo.svg" alt="" width="64" height="64">' +
      '<p class="tuto-kicker"></p><h2 class="tuto-title"></h2><p class="tuto-text"></p>' +
      '<p class="tuto-ok" role="status"></p>' +
      '<div class="tuto-foot"><div class="tuto-dots" aria-hidden="true"></div>' +
      '<div class="tuto-actions"><button class="tuto-btn is-ghost" type="button" data-act="prev"></button>' +
      '<button class="tuto-btn is-primary" type="button" id="tutoNext" data-act="next"></button></div></div>' +
    '</section>';
  document.body.appendChild(layer);
  ringEl = $('.tuto-ring', layer); handEl = $('.tuto-hand', layer); cardEl = $('.tuto-card', layer);
  kickerEl = $('.tuto-kicker', layer); titleEl = $('.tuto-title', layer); textEl = $('.tuto-text', layer);
  okEl = $('.tuto-ok', layer); dotsEl = $('.tuto-dots', layer);
  prevBtn = $('[data-act="prev"]', layer); nextBtn = $('[data-act="next"]', layer);
  $('.tuto-x', layer).addEventListener('click', () => close(true));
  prevBtn.addEventListener('click', () => (idx === 0 ? close(true) : go(idx - 1)));
  nextBtn.addEventListener('click', () => next());
}

function injectEntrypoints() {
  fab = document.createElement('button');
  fab.className = 'tuto-fab'; fab.type = 'button';
  fab.setAttribute('aria-label', 'Ver tutorial'); fab.title = 'Ver tutorial';
  fab.innerHTML = ICON.help;
  fab.addEventListener('click', () => start());
  document.body.appendChild(fab);

  const picker = $('.app-picker');
  if (picker) {
    const item = document.createElement('button');
    item.type = 'button'; item.className = 'app-choice tuto-menu-item';
    item.innerHTML = `<span class="app-choice-icon">${ICON.help}</span><strong>Ver tutorial</strong><small>Repite la guía paso a paso.</small>`;
    item.addEventListener('click', () => { $('#menuCloseBtn')?.click(); setTimeout(start, 320); });
    picker.appendChild(item);
  }
}

/* ───────── Flujo ───────── */
function setBox(el, x, y, w, h) {
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
}
function setGesture(g) {
  if (handEl.dataset.g === g) return;
  handEl.dataset.g = g;
  handEl.classList.remove('g-tap', 'g-swipe', 'g-swipey');
  handEl.classList.add('g-' + g);
}
function gestureOf(s) { return (typeof s.gesture === 'function' ? s.gesture() : s.gesture) || 'tap'; }

function start() {
  if (active) return;
  build();
  steps = STEPS[PAGE];
  active = true;
  menuClose();
  layer.hidden = false;
  document.body.classList.add('tuto-on');
  if (PAGE === 'circulos') scrollTo({ top: 0, behavior: 'auto' });
  setBox(ringEl, innerWidth / 2, innerHeight / 2, 0, 0);
  enter(0);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
  setTimeout(() => nextBtn.focus({ preventScroll: true }), 60);
}

function enter(n) {
  idx = n;
  const base = steps[n];
  cur = Object.assign({}, base, base.variant ? base.variant() : {});
  token++; succeeded = false;

  layer.classList.toggle('is-modal', !!cur.modal);
  document.body.classList.toggle('tuto-show-fab', !!cur.keepFab);
  ringEl.classList.add('is-moving'); handEl.classList.add('is-moving');
  clearTimeout(movingTimer);
  movingTimer = setTimeout(() => { ringEl.classList.remove('is-moving'); handEl.classList.remove('is-moving'); }, 700);

  const inner = steps.filter(s => !s.modal);
  const pos = steps.slice(0, n + 1).filter(s => !s.modal).length;
  kickerEl.textContent = `Paso ${Math.max(pos, 1)} de ${inner.length}`;
  titleEl.textContent = cur.title || '';
  textEl.textContent = cur.text || '';
  okEl.innerHTML = '';
  cardEl.classList.remove('is-ok', 'at-top', 'at-side');
  cardEl.style.animation = 'none'; void cardEl.offsetWidth; cardEl.style.animation = '';

  dotsEl.innerHTML = steps.map((_, k) => `<span class="tuto-dot ${k < n ? 'is-done' : k === n ? 'is-now' : ''}"></span>`).join('');
  prevBtn.textContent = n === 0 ? (cur.skip || 'Ahora no') : 'Anterior';
  nextBtn.textContent = cur.next || (n === steps.length - 1 ? 'Terminar' : 'Siguiente');

  try { cur.onEnter && cur.onEnter(); } catch (e) {}
  const t = token;
  setTimeout(() => { if (active && t === token) reveal(); }, 90);
}

function leave() { try { cur && cur.onExit && cur.onExit(); } catch (e) {} }
function go(n) { leave(); if (n >= steps.length) return close(true); enter(Math.max(0, n)); }
function next() { go(idx + 1); }

function close(remember) {
  if (!active) return;
  active = false;
  cancelAnimationFrame(raf);
  leave();
  hopped.forEach(clearHop);
  layer.hidden = true;
  document.body.classList.remove('tuto-on', 'tuto-show-fab');
  if (remember) saveDone();
  if (fab) { fab.classList.remove('is-hint'); void fab.offsetWidth; fab.classList.add('is-hint'); }
}

function success() {
  succeeded = true;
  okEl.innerHTML = ICON.check + '<span></span>';
  okEl.lastChild.textContent = cur.ok || '¡Muy bien!';
  cardEl.classList.add('is-ok');
  const t = token;
  setTimeout(() => { if (active && t === token) next(); }, 1400);
}

/* Lleva el elemento señalado a una zona visible, entre la cabecera y la tarjeta */
function reveal() {
  const el = pick(cur.ring) || pick(cur.at);
  const at = pick(cur.at);
  if (at && !onScreenX(at)) at.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (!el) return;
  if (inFixed(el)) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
  const r = el.getBoundingClientRect();
  const top0 = 92, cardH = cardEl.offsetHeight + 30, free = innerHeight - top0 - cardH;
  if (r.top >= top0 + 4 && r.bottom <= innerHeight - cardH - 4) return;
  const want = top0 + Math.max(10, (free - Math.min(r.height, free)) / 2);
  const delta = r.top - want;
  if (Math.abs(delta) > 6) scrollBy({ top: delta, behavior: reduced.matches ? 'auto' : 'smooth' });
}

/* Saltos: marca los botones del paso actual y quita la marca a los demás */
function clearHop(el) {
  el.classList.remove('tuto-hop', 'tuto-nudge', 'tuto-nudge-y');
  el.style.removeProperty('--i'); el.style.removeProperty('--hop-y');
  if (el.dataset) delete el.dataset.tutoCls;
  hopped.delete(el);
}
function syncHops(s) {
  const g = gestureOf(s);
  const cls = g === 'swipe' ? 'tuto-nudge' : g === 'swipey' ? 'tuto-nudge-y' : 'tuto-hop';
  const want = s.hop ? pickAll(s.hop).filter(onScreenX).slice(0, 14) : [];
  hopped.forEach(el => { if (!el.isConnected || !want.includes(el) || el.dataset.tutoCls !== cls) clearHop(el); });
  want.forEach((el, k) => {
    if (hopped.has(el)) return;
    el.classList.add(cls); el.dataset.tutoCls = cls; el.style.setProperty('--i', k);
    if (s.hopY) el.style.setProperty('--hop-y', s.hopY);
    hopped.add(el);
  });
}

/* Bucle: sigue al elemento aunque la página se desplace o cambie de tamaño */
function frame() {
  if (!active) return;
  raf = requestAnimationFrame(frame);
  const s = cur; if (!s) return;
  syncHops(s);

  const target = s.modal ? null : pick(s.ring);
  let rr = null;
  if (target) {
    rr = target.getBoundingClientRect();
    const pad = s.pad == null ? 6 : s.pad;
    const own = parseFloat(getComputedStyle(target).borderTopLeftRadius);
    const rad = s.radius != null ? s.radius : (isNaN(own) ? 16 : own + pad);
    setBox(ringEl, rr.left - pad, rr.top - pad, rr.width + pad * 2, rr.height + pad * 2);
    ringEl.style.borderRadius = Math.min(rad, (rr.height + pad * 2) / 2) + 'px';
    ringEl.classList.add('is-on');
  } else ringEl.classList.remove('is-on');

  const atEl = s.at ? pick(s.at) : target;
  if (atEl) {
    const g = gestureOf(s), a = atEl.getBoundingClientRect();
    setGesture(g);
    handEl.style.transform = `translate(${a.left + a.width / 2}px,${a.top + a.height / 2}px)`;
    handEl.style.setProperty('--sw', Math.max(30, Math.min(100, (g === 'swipey' ? a.height : a.width) * 0.3)) + 'px');
    handEl.classList.add('is-on');
  } else handEl.classList.remove('is-on');

  if (!s.modal) {                                  // la tarjeta sube o baja para no tapar lo señalado
    const ch = cardEl.offsetHeight;
    let top = cardEl.classList.contains('at-top');
    let side = null;
    if (rr) {
      const hitBottom = rr.bottom + 6 > innerHeight - ch - 22 && rr.top < innerHeight;
      const hitTop = rr.top - 6 < 92 + ch && rr.bottom > 0;
      if (!hitBottom) top = false; else if (!hitTop) top = true;
      else if (innerWidth >= 760 && rr.height > innerHeight * 0.6) {                // lo señalado ocupa casi toda la altura: la tarjeta va al costado libre
        const freeR = innerWidth - rr.right - 6 - 20, freeL = rr.left - 6 - 20;
        if (freeR >= 280 && freeR >= freeL) side = { left: rr.right + 6 + 10, w: Math.min(380, freeR - 10) };
        else if (freeL >= 280) side = { left: 20, w: Math.min(380, freeL - 10) };
      }
    } else top = false;
    cardEl.classList.toggle('at-top', top && !side);
    cardEl.classList.toggle('at-side', !!side);
    if (side) { cardEl.style.setProperty('--side-left', side.left + 'px'); cardEl.style.setProperty('--side-w', side.w + 'px'); }
  }
}

/* ───────── Acciones reales del usuario (solo toques/escritura verdaderos) ───────── */
let downXY = null;
function userAction(e, type) {
  if (!active || succeeded || !cur || !cur.tap || !e.isTrusted) return;
  if (type !== (cur.tap.ev || 'click')) return;
  const t = e.target;
  if (!(t instanceof Element) || t.closest('.tuto-layer, .tuto-fab')) return;
  if (t.closest(cur.tap.sel)) success();
}
addEventListener('pointerdown', e => { downXY = { x: e.clientX, y: e.clientY }; }, true);
addEventListener('pointerup', e => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y);
  downXY = null;
  if (moved < 10) userAction(e, 'click');
}, true);
addEventListener('click',  e => userAction(e, 'click'),  true);
addEventListener('change', e => userAction(e, 'change'), true);
addEventListener('input',  e => userAction(e, 'input'),  true);

addEventListener('keydown', e => {
  if (!active) return;
  if (e.key === 'Escape') { close(true); return; }
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1);
});

/* ───────── Arranque ───────── */
function init() {
  injectEntrypoints();
  window.circulosTutorial = { start, close: () => close(false) };
  const forced = new URLSearchParams(location.search).has('tutorial');
  if (!forced && !SHOW_EVERY_VISIT && isDone()) return;
  const ready = PAGE === 'circulos' ? '#circuloArmonico .harmony-wheel-node' : '.chord-catalog-card';
  let tries = 0;
  const timer = setInterval(() => {
    if ($(ready) || ++tries > 30) { clearInterval(timer); setTimeout(start, 450); }
  }, 150);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
