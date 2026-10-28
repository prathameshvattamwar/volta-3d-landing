/**
 * Entry point — boots everything in order:
 *  preloader → smooth scroll → 3D stage + product (lazy-loaded) → scroll choreography → reveal.
 */
import './styles/fonts.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/ui.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLenis } from './js/lenis.js';
import { createPreloader } from './js/preloader.js';
import { initScroll, playIntro } from './js/scroll.js';
import { initCursor, initMagnetic, initNav, initAnchors, initCart } from './js/ui.js';

gsap.registerPlugin(ScrollTrigger);

// Must match the mobile media query in sections.css
const MOBILE_QUERY = '(max-width: 767px), (max-aspect-ratio: 4/5)';

const mq = (q) => window.matchMedia(q);
const env = {
  isMobile: mq(MOBILE_QUERY).matches,
  isTouch: mq('(hover: none), (pointer: coarse)').matches,
  reducedMotion: mq('(prefers-reduced-motion: reduce)').matches,
};
mq(MOBILE_QUERY).addEventListener('change', (e) => (env.isMobile = e.matches));

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function showFallback() {
  const img = document.querySelector('.stage__fallback');
  img.loading = 'eager';
  img.hidden = false;
}

async function boot() {
  // Always start at the top so the intro plays in order
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const preloader = createPreloader(env);
  const fontsDone = preloader.track('fonts', 1);
  const engineDone = preloader.track('engine', 2);
  const modelDone = preloader.track('model', 3);

  // Hand split-text over to GSAP (it would read the CSS 110% offset back as pixels)
  gsap.set('.char, .word', { y: 0, yPercent: 110 });
  // Hide hero copy until the intro animation
  gsap.set('[data-hero-fade]', { autoAlpha: 0 });

  const lenis = initLenis(env);
  lenis.stop();

  initCursor(env);
  initMagnetic(env);
  initNav(lenis);
  initAnchors(lenis, env);
  initCart(env);

  // Fonts (only what's above the fold)
  Promise.all([
    document.fonts.load('700 1em "Clash Display"'),
    document.fonts.load('500 1em "Satoshi"'),
  ]).finally(() => fontsDone(1));

  // 3D: three.js is code-split, so the preloader paints instantly
  let stage = null;
  if (hasWebGL2()) {
    try {
      const [{ createStage }, { loadProduct }] = await Promise.all([import('./js/scene.js'), import('./js/model.js')]);
      engineDone(0.5);
      stage = createStage(document.querySelector('[data-stage]'), env);
      engineDone(1);
      const product = await loadProduct(modelDone);
      stage.setProduct(product);
      await stage.compile();
    } catch (err) {
      console.error('[3D] falling back to static image:', err);
      stage?.renderer?.domElement.remove();
      stage = null;
      showFallback();
    }
  } else {
    showFallback();
  }
  engineDone(1);
  modelDone(1);

  const scroll = initScroll({ stage, env, lenis });

  // ONE loop: Lenis (added first in initLenis) → scroll pose → render
  gsap.ticker.add((time) => {
    scroll.update();
    stage?.tick(time);
  });

  // Pause rendering while the 3D stage is scrolled out of view
  if (stage) {
    new IntersectionObserver(([entry]) => stage.setActive(entry.isIntersecting)).observe(document.querySelector('main'));
  }

  await preloader.finish();
  document.body.classList.remove('is-loading');
  lenis.start();
  ScrollTrigger.refresh();
  playIntro(stage, env);

  if (import.meta.env.DEV) window.__volta = { stage, lenis, ScrollTrigger, env };
}

boot();
