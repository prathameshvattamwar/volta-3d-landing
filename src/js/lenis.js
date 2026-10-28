/**
 * Lenis smooth scrolling, synced with GSAP's ticker and ScrollTrigger.
 * One requestAnimationFrame loop drives Lenis, ScrollTrigger AND the 3D render.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initLenis(env) {
  const lenis = new Lenis({
    autoRaf: false,
    lerp: env.reducedMotion ? 1 : 0.085, // reduced motion = instant, native-feeling scroll
    smoothWheel: !env.reducedMotion,
    syncTouch: false, // keep native momentum on phones (feels natural)
    touchMultiplier: 1,
    anchors: false, // we handle anchor links ourselves (with offsets)
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Don't refresh ScrollTrigger when the mobile URL bar shows/hides
  ScrollTrigger.config({ ignoreMobileResize: true });

  return lenis;
}
