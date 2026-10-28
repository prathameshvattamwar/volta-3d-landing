/**
 * Preloader with a percentage tied to REAL loading tasks (fonts, 3D engine, model),
 * then a two-panel wipe that reveals the page.
 */
import { gsap } from 'gsap';

export function createPreloader(env) {
  const el = document.querySelector('.preloader');
  const countEl = el.querySelector('[data-preloader-count]');
  const bar = el.querySelector('[data-preloader-bar]');
  const tasks = {};
  const started = performance.now();
  const minDuration = env.reducedMotion ? 200 : 800; // never flash by too fast to read
  let shown = 0;

  /** Register a task with a weight; returns a progress setter (0..1). */
  function track(name, weight) {
    tasks[name] = { weight, p: 0 };
    return (p) => (tasks[name].p = Math.max(tasks[name].p, Math.min(1, p)));
  }

  const real = () => {
    let w = 0, s = 0;
    for (const t of Object.values(tasks)) {
      w += t.weight;
      s += t.weight * t.p;
    }
    return w ? s / w : 0;
  };

  function update() {
    const goal = Math.min(real(), (performance.now() - started) / minDuration);
    shown += (goal - shown) * 0.2;
    if (Math.abs(goal - shown) < 0.003) shown = goal;
    countEl.textContent = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown})`;
  }
  gsap.ticker.add(update);

  /** Resolves when everything is loaded; the wipe keeps playing after it resolves. */
  function finish() {
    return new Promise((resolve) => {
      const check = () => {
        if (real() < 1 || shown < 1) return;
        gsap.ticker.remove(check);
        gsap.ticker.remove(update);
        el.setAttribute('aria-label', 'Loaded');
        el.classList.add('is-done');

        if (env.reducedMotion) {
          gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: () => el.remove() });
          resolve();
          return;
        }
        gsap.timeline({ onComplete: () => el.remove() })
          .to(el.querySelectorAll('.preloader__panel--main > *'), { yPercent: -40, autoAlpha: 0, duration: 0.5, ease: 'power3.in', stagger: 0.03 })
          .to('.preloader__panel--main', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 0.25)
          .to('.preloader__panel--accent', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 0.37)
          .call(resolve, null, 0.75);
      };
      gsap.ticker.add(check);
    });
  }

  return { track, finish };
}
