/**
 * UI interactions: custom cursor, magnetic buttons, auto-hiding nav,
 * smooth anchor links and the cart counter.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { COPY } from '../copy.js';

const INTERACTIVE = 'a, button, label';
const DRAG = '[data-cursor="drag"]';

/** Circle cursor that grows over links/buttons. Desktop (fine pointer) only. */
export function initCursor(env) {
  if (env.isTouch) return;
  const el = document.querySelector('.cursor');
  const ring = el.querySelector('.cursor__ring');
  const dot = el.querySelector('.cursor__dot');
  document.documentElement.classList.add('has-cursor');
  el.classList.add('is-hidden');

  const fast = env.reducedMotion ? 0.01 : 0.12;
  const slow = env.reducedMotion ? 0.01 : 0.5;
  const rx = gsap.quickTo(ring, 'x', { duration: slow, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: slow, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: fast, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: fast, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
      el.classList.remove('is-hidden');
    },
    { passive: true }
  );
  document.addEventListener('pointerover', (e) => {
    el.classList.toggle('is-drag', !!e.target.closest?.(DRAG));
    if (e.target.closest?.(INTERACTIVE)) el.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest?.(INTERACTIVE) && !e.relatedTarget?.closest?.(INTERACTIVE)) el.classList.remove('is-hover');
    if (!e.relatedTarget?.closest?.(DRAG)) el.classList.remove('is-drag');
  });
  document.documentElement.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
}

/** Buttons that lean toward the cursor, then spring back. */
export function initMagnetic(env) {
  if (env.isTouch || env.reducedMotion) return;
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const label = btn.querySelector('.btn__label');
    const bx = gsap.quickTo(btn, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const by = gsap.quickTo(btn, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const lx = label && gsap.quickTo(label, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const ly = label && gsap.quickTo(label, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      bx(mx * 0.3);
      by(my * 0.45);
      lx?.(mx * 0.1);
      ly?.(my * 0.15);
    });
    btn.addEventListener('pointerleave', () => {
      bx(0);
      by(0);
      lx?.(0);
      ly?.(0);
    });
  });
}

/** Nav hides when scrolling down, comes back when scrolling up. */
export function initNav(lenis) {
  const nav = document.querySelector('[data-nav]');
  let hidden = false;
  const set = (h) => {
    if (h === hidden) return;
    hidden = h;
    nav.classList.toggle('is-hidden', h);
  };
  lenis.on('scroll', ({ scroll, direction }) => {
    if (scroll < 80) set(false);
    else if (direction === 1) set(true);
    else if (direction === -1) set(false);
  });
  nav.addEventListener('focusin', () => set(false)); // always visible for keyboard users
}

/** Smooth-scroll in-page links with Lenis, and move focus for accessibility. */
export function initAnchors(lenis, env) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, {
      duration: env.reducedMotion ? 0 : 1.6,
      immediate: env.reducedMotion,
      onComplete: () => {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
  });
}

/** "Get yours" adds the selected size to the cart: badge bump + toast. */
export function initCart(env) {
  const countEl = document.querySelector('[data-cart-count]');
  const cart = document.querySelector('[data-cart]');
  const toast = document.querySelector('[data-toast]');
  let count = 0;
  let hideTimer;
  document.querySelectorAll('[data-add-to-cart]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      count++;
      countEl.textContent = count;
      cart.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}`);
      if (!env.reducedMotion) gsap.fromTo(cart, { scale: 1.35 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' });

      const size = document.querySelector('input[name="size"]:checked')?.value;
      const sizeText = size ? ` · ${COPY.sizes.label} ${size}` : '';
      toast.innerHTML = `<span class="toast__dot" aria-hidden="true"></span><span>Added <strong></strong>${sizeText} to your bag</span>`;
      toast.querySelector('strong').textContent = COPY.fullName;
      toast.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
    })
  );
}

/**
 * Drag (mouse) or swipe (touch) across the final section to spin the product.
 * Only active while the CTA section is on screen; the product unwinds when you leave.
 */
export function initSpin(stage, env) {
  const zone = document.querySelector('[data-spin]');
  if (!zone || !stage) return;
  const hint = zone.querySelector('[data-hint-text]');
  if (env.isTouch) hint.textContent = 'Swipe to spin';
  const { spin } = stage;

  ScrollTrigger.create({
    trigger: '.cta',
    start: 'top 25%',
    end: 'bottom top',
    onToggle: (self) => (spin.enabled = self.isActive),
  });

  let lastX = 0, lastT = 0, pointer = null;
  zone.addEventListener('pointerdown', (e) => {
    if (!spin.enabled) return;
    pointer = e.pointerId;
    zone.setPointerCapture(pointer);
    spin.dragging = true;
    spin.velocity = 0;
    lastX = e.clientX;
    lastT = performance.now();
    zone.classList.add('is-used');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    const now = performance.now();
    const delta = ((e.clientX - lastX) / window.innerWidth) * Math.PI * 2.2; // full-width drag ≈ one turn
    spin.value += delta;
    spin.velocity = (delta / Math.max(now - lastT, 8)) * 16; // per-frame speed for the glide
    lastX = e.clientX;
    lastT = now;
  });
  const release = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    spin.dragging = false;
    if (performance.now() - lastT > 80) spin.velocity = 0; // paused before letting go → no glide
  };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);
}
