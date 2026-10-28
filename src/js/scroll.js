/**
 * Scroll choreography.
 *
 * HOW IT WORKS
 * Every section has a ScrollTrigger that reports its progress (0 → 1).
 * A list of "segments" maps slices of that progress to a transition between two
 * POSES (product position/rotation/scale, camera, background color, product color,
 * exploded amount). Each frame we find the active segment and interpolate.
 * Because the pose is computed from the scroll position, scrolling up reverses
 * everything perfectly — even if you jump around with the nav links.
 *
 * HTML text animations are regular GSAP timelines scrubbed by ScrollTrigger.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PRIMARY_COLOR, ACCENT_COLOR, DARK_COLOR, COLOR_VARIANTS } from '../config.js';
import { COPY } from '../copy.js';

gsap.registerPlugin(ScrollTrigger);

const TAU = Math.PI * 2;
const LIGHT = '#F6F4EE';
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Color helpers ----------
const rgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const toHex = (c) => '#' + c.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
const luminance = (c) => {
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const LUM_DARK = luminance(rgb(DARK_COLOR));
const LUM_LIGHT = luminance(rgb(LIGHT));
/** Pick the text color (dark or light) with the best contrast on a background. */
const fgFor = (c) => {
  const l = luminance(c);
  return contrast(l, LUM_DARK) >= contrast(l, LUM_LIGHT) ? DARK_COLOR : LIGHT;
};

const NUM_KEYS = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 's', 'cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'shadow', 'explode'];
const CAM = { cx: 0, cy: 0.3, cz: 10, tx: 0, ty: 0, tz: 0 };
const pose = (o) => ({
  px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1, ...CAM, shadow: 0, explode: 0,
  bg: PRIMARY_COLOR, color: ACCENT_COLOR, ...o,
});

const EASES = {
  inOut: gsap.parseEase('power2.inOut'),
  spin: gsap.parseEase('power1.inOut'),
  in: gsap.parseEase('power2.in'),
  land: gsap.parseEase('back.out(1.7)'),
};

export function initScroll({ stage, env, lenis }) {
  const rm = env.reducedMotion;
  const Y = (v) => (rm ? 0 : v); // no movement under prefers-reduced-motion
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const root = document.documentElement;

  // ============================================================
  //  Section triggers (progress only — no scrub needed)
  // ============================================================
  const st = {
    intro: ScrollTrigger.create({ trigger: '.intro', start: 'top bottom', end: 'bottom bottom' }),
    callouts: ScrollTrigger.create({ trigger: '.callouts', start: 'top bottom', end: 'bottom bottom' }),
    color: ScrollTrigger.create({ trigger: '.colorway', start: 'top bottom', end: 'bottom bottom' }),
    layers: ScrollTrigger.create({ trigger: '.layers', start: 'top bottom', end: 'bottom bottom' }),
    specs: ScrollTrigger.create({ trigger: '.specs', start: 'top bottom', end: 'top 15%' }),
    cta: ScrollTrigger.create({ trigger: '.cta', start: 'top bottom', end: 'top top' }),
  };

  // Progress windows (fractions of each section's scroll range)
  const CALLOUT_MOVES = [[0, 0.22], [0.36, 0.46], [0.62, 0.72]];
  const CALLOUT_CARDS = [[0.16, 0.37], [0.44, 0.63], [0.7, 0.97]];
  const n = COLOR_VARIANTS.length;
  const cwStart = 0.2, cwEnd = 0.95, slot = (cwEnd - cwStart) / n;
  const cwBounds = Array.from({ length: n - 1 }, (_, i) => cwStart + slot * (i + 1)); // color switch points

  // ============================================================
  //  Poses
  // ============================================================
  let segments = [];
  let fit = 1;

  /** Camera framing for a feature callout: zoom to the anchor, leave room for the card. */
  function calloutPose(c, m, base) {
    const p = pose({ ...base, rx: c.view.rot[0], ry: c.view.rot[1], rz: c.view.rot[2], shadow: 0 });
    if (!stage?.product) return p;
    const { THREE, rig, pivot, camera } = stage;
    const anchor = stage.product.anchors[c.anchor];
    // Temporarily put the rig in this pose to measure the anchor's world position
    rig.position.set(p.px, p.py, p.pz);
    rig.scale.setScalar(p.s * fit);
    pivot.position.set(0, 0, 0);
    pivot.rotation.set(p.rx, p.ry, p.rz);
    rig.updateMatrixWorld(true);
    const A = anchor.getWorldPosition(new THREE.Vector3());

    const dir = new THREE.Vector3(...c.view.dir).normalize();
    const dist = c.view.dist * Math.max(fit, 0.55) * (m ? 1.25 : 1);
    const f = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(f, camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const hh = dist * Math.tan(stage.fovRad / 2);
    const hw = hh * camera.aspect;
    const T = A.clone();
    if (m) T.addScaledVector(up, -0.32 * hh); // card at the bottom → anchor in the upper half
    else T.addScaledVector(right, (c.side === 'left' ? -1 : 1) * 0.26 * Math.max(1, 1.6 / camera.aspect) * hw); // card on one side → anchor on the other
    const C = T.clone().addScaledVector(dir, dist);
    Object.assign(p, { cx: C.x, cy: C.y, cz: C.z, tx: T.x, ty: T.y, tz: T.z });
    return p;
  }

  function buildPoses() {
    const m = env.isMobile;
    const aspect = window.innerWidth / window.innerHeight;
    // Keep the product inside narrow (portrait) screens
    fit = Math.min(1, (aspect * 2 * 10 * Math.tan((30 * Math.PI) / 360) * 0.86) / 3.4);

    const hero = pose({ py: m ? 0.2 : -0.18, rx: 0.12, ry: -0.5, rz: 0.06, s: m ? 1.05 : 1.32, shadow: 1 });
    const intro = pose({ px: m ? 0 : 1.85, py: m ? 0.95 : -0.05, rx: 0.15, ry: -0.5 + TAU, rz: 0.03, s: m ? 0.85 : 1, shadow: 0.8, spin: true });
    const callouts = COPY.callouts.map((c) => calloutPose(c, m, { s: 1 }));
    const colorways = COLOR_VARIANTS.map((hex, i) =>
      pose({ px: m ? 0 : 1.0, py: m ? 0.6 : -0.05, rx: 0.14, ry: -0.35 + i * 0.6, rz: 0.04, s: m ? 0.92 : 1.05, shadow: 0.9, bg: hex, color: hex })
    );
    const layersIn = pose({ py: m ? 0.2 : 0.05, rx: 0.55, ry: -0.95, rz: -0.55, s: m ? 0.95 : 1.12, bg: DARK_COLOR });
    const layersOut = { ...layersIn, rx: 0.5, ry: -0.6, s: m ? 0.78 : 0.98, explode: m ? 0.75 : 1 };
    const layersEnd = { ...layersOut, ry: -0.3, rz: -0.42 };
    const specs = pose({ px: m ? 0 : 2.55, py: m ? 3.8 : 0.1, rx: 0.25, ry: -0.2, rz: 0.12, s: m ? 0.6 : 0.78, bg: ACCENT_COLOR, color: PRIMARY_COLOR });
    const ctaAir = pose({ py: m ? 1.4 : 1.3, rx: -0.25, ry: -0.9, rz: 0.25, s: m ? 0.88 : 0.95, shadow: 0.2 });
    const cta = pose({ py: m ? 0.08 : -0.1, rx: 0.1, ry: -0.5, rz: 0.05, s: m ? 0.98 : 1.0, shadow: 1 });

    // Keep rotations continuous (no backwards unwinding), except the deliberate 360° spin
    const chain = [hero, intro, ...callouts, ...colorways, layersIn, layersOut, layersEnd, specs, ctaAir, cta];
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].spin) continue;
      chain[i].ry += TAU * Math.round((chain[i - 1].ry - chain[i].ry) / TAU);
    }
    chain.forEach((p) => {
      p.bgRGB = rgb(p.bg);
      p.colorRGB = rgb(p.color);
    });

    const seg = (trigger, a, b, from, to, ease = EASES.inOut) => ({ trigger, a, b, from, to, ease });
    segments = [
      seg(st.intro, 0, 0.85, hero, intro, EASES.spin),
      seg(st.callouts, ...CALLOUT_MOVES[0], intro, callouts[0]),
      seg(st.callouts, ...CALLOUT_MOVES[1], callouts[0], callouts[1]),
      seg(st.callouts, ...CALLOUT_MOVES[2], callouts[1], callouts[2]),
      seg(st.color, 0, 0.18, callouts[2], colorways[0]),
      ...cwBounds.map((b, i) => seg(st.color, b - 0.05, b + 0.05, colorways[i], colorways[i + 1])),
      seg(st.layers, 0, 0.3, colorways[n - 1], layersIn),
      seg(st.layers, 0.35, 0.7, layersIn, layersOut),
      seg(st.layers, 0.7, 1, layersOut, layersEnd),
      seg(st.specs, 0, 1, layersEnd, specs),
      seg(st.cta, 0, 0.55, specs, ctaAir, EASES.in),
      seg(st.cta, 0.55, 1, ctaAir, cta, EASES.land),
    ];
  }

  // ============================================================
  //  Per-frame update: scroll → pose → 3D + page colors
  // ============================================================
  const out = { bgRGB: [0, 0, 0], colorRGB: [0, 0, 0] };
  let lastBg = '', lastColor = '', canvasOpacity = 1;
  const canvas = stage?.renderer.domElement;
  const tmpColor = stage ? new stage.THREE.Color() : null;

  function update() {
    if (!segments.length) return;
    let active = segments[0], t = 0;
    for (const s of segments) {
      const lt = clamp01((s.trigger.progress - s.a) / (s.b - s.a));
      if (lt > 0) {
        active = s;
        t = lt;
      }
    }
    let e = active.ease(t);
    let opacity = 1;
    if (rm) {
      // Reduced motion: no in-between movement, just a quick crossfade between poses
      opacity = active.from === active.to ? 1 : clamp01(Math.abs(t - 0.5) * 2.5);
      e = t < 0.5 ? 0 : 1;
    }
    const { from, to } = active;
    for (const k of NUM_KEYS) out[k] = lerp(from[k], to[k], e);
    const ce = clamp01(rm ? e : active.ease === EASES.land ? t : e); // colors never overshoot
    for (let i = 0; i < 3; i++) {
      out.bgRGB[i] = lerp(from.bgRGB[i], to.bgRGB[i], ce);
      out.colorRGB[i] = lerp(from.colorRGB[i], to.colorRGB[i], ce);
    }

    // Page background + auto-contrast text color
    const bg = toHex(out.bgRGB);
    if (bg !== lastBg) {
      lastBg = bg;
      root.style.setProperty('--bg', bg);
      root.style.setProperty('--fg', fgFor(out.bgRGB));
    }

    updateColorwayUI();
    if (!stage) return;

    // 3D pose
    Object.assign(stage.pose, out);
    stage.pose.s = out.s * fit;
    const color = toHex(out.colorRGB);
    if (color !== lastColor && stage.product) {
      lastColor = color;
      stage.product.setColor(tmpColor.setRGB(...out.colorRGB, stage.THREE.SRGBColorSpace));
      stage.pose.colorKey = (stage.pose.colorKey || 0) + 1;
    }
    if (opacity !== canvasOpacity) {
      canvasOpacity = opacity;
      canvas.style.opacity = opacity;
    }
  }

  // ============================================================
  //  Colorway UI (big "01 / 04" number, name, swatches)
  // ============================================================
  const track = $('[data-colorway-track]');
  const nameEl = $('[data-colorway-name]');
  const swatches = $$('[data-swatch]');
  let colorIdx = 0;
  function updateColorwayUI() {
    const p = st.color.progress;
    const idx = cwBounds.filter((b) => p > b).length;
    if (idx === colorIdx) return;
    colorIdx = idx;
    gsap.to(track, { yPercent: (-100 * idx) / n, duration: rm ? 0 : 0.7, ease: 'expo.out', overwrite: true });
    swatches.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.setAttribute('aria-pressed', String(i === idx));
    });
    const name = COPY.colorways[idx].name;
    if (rm) {
      nameEl.textContent = name;
      return;
    }
    gsap.timeline({ overwrite: true })
      .to(nameEl, { yPercent: -110, duration: 0.22, ease: 'power2.in' })
      .call(() => (nameEl.textContent = name))
      .fromTo(nameEl, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: 'expo.out' });
  }
  // Clicking a swatch scrolls to that colorway
  swatches.forEach((s, i) => {
    s.setAttribute('aria-pressed', String(i === 0));
    s.addEventListener('click', () => {
      const lo = i === 0 ? cwStart : cwBounds[i - 1] + 0.05;
      const hi = i === n - 1 ? cwEnd : cwBounds[i] - 0.05;
      const y = st.color.start + ((lo + hi) / 2) * (st.color.end - st.color.start);
      lenis.scrollTo(y, { duration: rm ? 0 : 1.2 });
    });
  });

  // ============================================================
  //  Feature callout lines (anchor on the product → card)
  // ============================================================
  const vis = Object.fromEntries(COPY.callouts.map((_, i) => [`v${i}`, 0]));
  const cards = $$('[data-callout]');
  const svg = $('.callouts__lines');
  const lines = $$('.callout-line').map((g) => ({
    g,
    line: g.querySelector('line'),
    dots: g.querySelectorAll('circle'),
  }));

  function drawLines() {
    if (!stage?.product) return;
    let any = false;
    for (let i = 0; i < cards.length; i++) any ||= vis[`v${i}`] > 0.001;
    if (!any) {
      lines.forEach((l) => (l.g.style.opacity = 0));
      return;
    }
    stage.scene.updateMatrixWorld();
    stage.camera.updateMatrixWorld();
    const box = svg.getBoundingClientRect();
    COPY.callouts.forEach((c, i) => {
      const v = vis[`v${i}`];
      const l = lines[i];
      if (v <= 0.001) {
        l.g.style.opacity = 0;
        return;
      }
      const a = stage.project(stage.product.anchors[c.anchor]);
      const r = cards[i].getBoundingClientRect();
      let ex, ey;
      if (env.isMobile) {
        ex = Math.min(Math.max(a.x, r.left + 28), r.right - 28);
        ey = r.top;
      } else {
        ex = c.side === 'left' ? r.right : r.left;
        ey = r.top + 44;
      }
      const ax = a.x - box.left, ay = a.y - box.top;
      const bx = ax + (ex - box.left - ax) * v, by = ay + (ey - box.top - ay) * v;
      l.line.setAttribute('x1', ax);
      l.line.setAttribute('y1', ay);
      l.line.setAttribute('x2', bx);
      l.line.setAttribute('y2', by);
      l.dots.forEach((d) => {
        d.setAttribute('cx', ax);
        d.setAttribute('cy', ay);
      });
      l.g.style.opacity = Math.min(1, v * 2);
    });
  }
  stage?.onBeforeRender(drawLines);

  // ============================================================
  //  Text animations (scrubbed)
  // ============================================================
  const scrub = (trigger, start, end, extra = {}) => ({ scrollTrigger: { trigger, start, end, scrub: true, ...extra } });

  // 1. HERO — slides away as you scroll
  gsap.timeline(scrub('.hero', 'top top', 'bottom top'))
    .fromTo('.hero__tagline .word', { yPercent: 0 }, { yPercent: rm ? 0 : -110, autoAlpha: rm ? 0 : 1, stagger: 0.04, ease: 'none', immediateRender: false }, 0)
    .fromTo('[data-hero-fade]', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: Y(-40), ease: 'none', immediateRender: false }, 0)
    .fromTo('.backdrop__hero', { autoAlpha: 1, yPercent: 0, scale: 1 }, { autoAlpha: 0, yPercent: Y(-14), scale: rm ? 1 : 0.9, ease: 'none', immediateRender: false }, 0);

  // 2. SPIN REVEAL — copy slides in from the side opposite the product
  gsap.fromTo('.intro__content > *',
    { autoAlpha: 0, x: env.isMobile ? 0 : Y(-90), y: env.isMobile ? Y(40) : 0 },
    { autoAlpha: 1, x: 0, y: 0, stagger: 0.12, ease: 'power2.out', ...scrub('.intro', 'top 85%', 'top 5%') });
  gsap.to('.intro__content', { autoAlpha: 0, y: Y(-60), ease: 'none', ...scrub('.intro', 'bottom 105%', 'bottom 55%') });

  // 3. FEATURE CALLOUTS — cards + lines, timed to the camera moves
  gsap.fromTo('.callouts__title', { autoAlpha: 0 }, { autoAlpha: 1, ...scrub('.callouts', 'top 60%', 'top 20%') });
  const ctl = gsap.timeline(scrub('.callouts', 'top bottom', 'bottom bottom'));
  ctl.to({}, { duration: 1 }, 0); // timeline length = 1 so positions are fractions
  CALLOUT_CARDS.forEach(([a, b], i) => {
    if (!cards[i]) return;
    ctl.fromTo(cards[i], { autoAlpha: 0, y: Y(50) }, { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out', immediateRender: false }, a)
      .to(cards[i], { autoAlpha: 0, y: Y(-40), duration: 0.04, ease: 'power2.in' }, b - 0.04)
      .fromTo(vis, { [`v${i}`]: 0 }, { [`v${i}`]: 1, duration: 0.06, ease: 'power2.out', immediateRender: false }, a + 0.01)
      .to(vis, { [`v${i}`]: 0, duration: 0.03 }, b - 0.04);
  });

  // 4. COLORWAY
  gsap.fromTo('.colorway__head > *, .colorway__counter, .colorway__info',
    { autoAlpha: 0, y: Y(60) },
    { autoAlpha: 1, y: 0, stagger: 0.08, ease: 'power2.out', ...scrub('.colorway', 'top 75%', 'top 10%') });

  // 5. EXPLODED VIEW — marquee of outlined text behind the product
  gsap.timeline(scrub('.layers', 'top 75%', 'bottom 55%'))
    .fromTo('.backdrop__marquee', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: 'none' }, 0)
    .to('.backdrop__marquee', { autoAlpha: 0, duration: 0.15, ease: 'none' }, 0.85);
  if (!rm) {
    gsap.fromTo('[data-marquee="1"]', { xPercent: 0 }, { xPercent: -36, ease: 'none', ...scrub('.layers', 'top bottom', 'bottom top') });
    gsap.fromTo('[data-marquee="-1"]', { xPercent: -36 }, { xPercent: 0, ease: 'none', ...scrub('.layers', 'top bottom', 'bottom top') });
  }
  gsap.fromTo('.layers__head > *, .layers__list li',
    { autoAlpha: 0, y: Y(40) },
    { autoAlpha: 1, y: 0, stagger: 0.06, ease: 'power2.out', ...scrub('.layers', 'top 60%', 'top -40%') });

  // 6. SPECS — heading + grid, numbers count up when visible
  gsap.fromTo('.specs__inner > .eyebrow, .specs__inner > .h2, .spec',
    { autoAlpha: 0, y: Y(60) },
    { autoAlpha: 1, y: 0, stagger: 0.06, ease: 'power2.out', ...scrub('.specs', 'top 85%', 'top 10%') });
  const counters = $$('[data-count]');
  const countUp = () =>
    counters.forEach((el) => {
      const end = Number(el.dataset.count);
      if (rm) return (el.textContent = end);
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', overwrite: true, onUpdate: () => (el.textContent = Math.round(o.v)) });
    });
  if (!rm) counters.forEach((el) => (el.textContent = '0'));
  ScrollTrigger.create({
    trigger: '.specs__grid',
    start: 'top 85%',
    onEnter: countUp,
    onLeaveBack: () => !rm && counters.forEach((el) => (el.textContent = '0')),
  });

  // 7. CTA — headline rises, outlined brand fades in behind the product
  gsap.fromTo('.cta__title .word', { yPercent: rm ? 0 : 110, autoAlpha: rm ? 0 : 1 }, { yPercent: 0, autoAlpha: 1, stagger: 0.08, ease: 'power3.out', ...scrub('.cta', 'top 80%', 'top 20%') });
  gsap.fromTo('.cta__top .eyebrow, .cta__bottom > *', { autoAlpha: 0, y: Y(30) }, { autoAlpha: 1, y: 0, stagger: 0.08, ease: 'power2.out', ...scrub('.cta', 'top 40%', 'top -5%') });
  gsap.fromTo('.backdrop__cta', { autoAlpha: 0, scale: rm ? 1 : 1.15 }, { autoAlpha: 1, scale: 1, ease: 'none', ...scrub('.cta', 'top 60%', 'top top') });

  // Nav turns light over the dark footer
  ScrollTrigger.create({
    trigger: '.footer',
    start: 'top 60px',
    onToggle: (self) => $('[data-nav]').classList.toggle('is-light', self.isActive),
  });

  // Rebuild poses whenever layout changes (resize, orientation, breakpoint)
  buildPoses();
  ScrollTrigger.addEventListener('refresh', buildPoses);

  return { update, buildPoses };
}

/** Hero entrance after the preloader: split-letter stagger + product scale-in. */
export function playIntro(stage, env) {
  const rm = env.reducedMotion;
  const tl = gsap.timeline();
  if (rm) {
    gsap.set('.hero-word .char, .hero__tagline .word', { yPercent: 0 });
    tl.fromTo('.hero-word, .hero__tagline, [data-hero-fade]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 });
    if (stage) stage.entrance = 1;
    return tl;
  }
  tl.fromTo('.hero-word .char', { yPercent: 110 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }, 0)
    .fromTo('.hero__tagline .word', { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 0.3)
    .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out' }, 0.55);
  if (stage) tl.fromTo(stage, { entrance: 0 }, { entrance: 1, duration: 1.8, ease: 'expo.out' }, 0.05);
  return tl;
}
