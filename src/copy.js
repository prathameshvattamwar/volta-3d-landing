/**
 * Marketing copy for every section, generated from PRODUCT + BRAND_NAME.
 * Pure data (no DOM access) so it can run both in the browser and at build time.
 *
 * Callout fields:
 *  - anchor:   name of an anchor point on the procedural model
 *  - fallback: same point as normalized bounding-box coords (-0.5..0.5) for a loaded .glb
 *  - view:     how the camera frames that part
 *              rot  = product rotation [x, y, z] in radians while zoomed in
 *              dir  = direction (in world space) the camera looks from
 *              dist = camera distance from the part
 */
import { PRODUCT, BRAND_NAME, TAGLINE, COLOR_VARIANTS } from './config.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const brandTitle = cap(BRAND_NAME.toLowerCase());

const PRESETS = {
  sneaker: (b) => ({
    modelName: 'Surge 01',
    category: 'Performance runner',
    price: 189,
    heroEyebrow: 'New drop — Surge 01',
    heroNote: 'Ultralight knit. Supercharged foam. Zero compromise.',
    intro: {
      eyebrow: '01 — The silhouette',
      title: 'Engineered to move first.',
      body: `Every curve of the ${b} Surge 01 was shaped in the wind tunnel and proven on the track. A one-piece knit upper hugs like a second skin, while a full-length foam core turns every landing into launch.`,
      stats: [
        ['212g', 'Featherweight build'],
        ['8mm', 'Heel-to-toe drop'],
      ],
    },
    callouts: [
      {
        title: 'AeroKnit upper',
        body: 'Engineered knit zones breathe where you heat up and lock in where you need support.',
        anchor: 'upper',
        fallback: [0.15, 0.25, 0.5],
        view: { rot: [0.05, -0.35, 0], dir: [0.15, 0.25, 1], dist: 4.4 },
        side: 'left',
      },
      {
        title: 'VoltCell heel',
        body: 'A pressurized energy cell absorbs impact and fires it back. 87% energy return, stride after stride.',
        anchor: 'heel',
        fallback: [-0.38, -0.25, 0.5],
        view: { rot: [0, 0.55, 0], dir: [-0.15, 0.1, 1], dist: 3.7 },
        side: 'right',
      },
      {
        title: 'GripLock outsole',
        body: 'Multi-directional lugs bite into wet streets and dusty trails alike. Traction you never think about.',
        anchor: 'outsole',
        fallback: [0.4, -0.45, 0.2],
        view: { rot: [0.45, -0.6, 0.15], dir: [0.3, -0.35, 1], dist: 4.2 },
        side: 'left',
      },
    ],
    layers: {
      eyebrow: '04 — Anatomy',
      title: 'Built in layers. Tuned as one.',
      items: ['AeroKnit upper', 'Lockdown lacing', 'Supercharged foam', 'VoltCell heel unit', 'GripLock rubber'],
      marquee: 'ENGINEERED IN LAYERS',
    },
    specs: {
      eyebrow: '05 — By the numbers',
      title: "The numbers don't lie.",
      items: [
        { value: 212, suffix: 'g', label: 'Weight, men’s US 9' },
        { value: 87, suffix: '%', label: 'Energy return' },
        { value: 36, suffix: 'mm', label: 'Heel stack height' },
        { value: 8, suffix: 'mm', label: 'Heel-to-toe drop' },
        { value: 50, suffix: '%', label: 'Recycled materials' },
        { value: 800, suffix: 'km', label: 'Tested lifespan' },
      ],
    },
    cta: {
      title: 'Your next move.',
      body: 'Free express shipping and 30-day test runs. Not faster? Send them back.',
      button: 'Get yours',
      note: 'Sizes US 4 – 15 · Ships in 24h',
    },
    meta: {
      description: `${b} Surge 01 — the ultralight performance sneaker with an AeroKnit upper and VoltCell heel. ${TAGLINE}`,
    },
  }),

  headphones: (b) => ({
    modelName: 'Pulse ANC',
    category: 'Wireless headphones',
    price: 349,
    heroEyebrow: 'New — Pulse ANC',
    heroNote: 'Studio sound. Total silence. 60 hours of battery.',
    intro: {
      eyebrow: '01 — The sound',
      title: 'Hear everything. Hear nothing else.',
      body: `The ${b} Pulse ANC pairs custom 40mm drivers with adaptive noise cancelling that reads the room 50,000 times a second. Your music, nothing more.`,
      stats: [
        ['60h', 'Battery life'],
        ['-42dB', 'Noise reduction'],
      ],
    },
    callouts: [
      {
        title: 'CloudFoam cushions',
        body: 'Memory foam wrapped in protein leather. Hours in, you will forget they are on.',
        anchor: 'cushion',
        fallback: [0.4, -0.25, 0.3],
        view: { rot: [0, -0.9, 0], dir: [0.6, -0.1, 1], dist: 4.0 },
        side: 'left',
      },
      {
        title: '40mm Volt drivers',
        body: 'Beryllium-coated domes for thunderous lows and crystal highs, tuned by Grammy-winning engineers.',
        anchor: 'cup',
        fallback: [-0.45, -0.2, 0],
        view: { rot: [0, 0.6, 0], dir: [-0.6, 0, 1], dist: 3.8 },
        side: 'right',
      },
      {
        title: 'FlexArc headband',
        body: 'Aerospace aluminium core with a pressure-mapped cushion. Feather-light clamp, zero hot spots.',
        anchor: 'band',
        fallback: [0, 0.48, 0],
        view: { rot: [0.25, -0.2, 0], dir: [0, 0.6, 1], dist: 4.2 },
        side: 'left',
      },
    ],
    layers: {
      eyebrow: '04 — Anatomy',
      title: 'Precision in every layer.',
      items: ['FlexArc headband', 'Aluminium yokes', '40mm Volt drivers', 'Adaptive ANC array', 'CloudFoam cushions'],
      marquee: 'PURE SIGNAL',
    },
    specs: {
      eyebrow: '05 — By the numbers',
      title: 'Numbers worth hearing.',
      items: [
        { value: 60, suffix: 'h', label: 'Battery with ANC on' },
        { value: 42, suffix: 'dB', label: 'Noise reduction' },
        { value: 40, suffix: 'mm', label: 'Driver diameter' },
        { value: 248, suffix: 'g', label: 'Total weight' },
        { value: 10, suffix: 'min', label: 'Charge for 5 hours' },
        { value: 8, suffix: '', label: 'Beamforming mics' },
      ],
    },
    cta: {
      title: 'Turn the world down.',
      body: 'Free express shipping and a 30-day listening trial.',
      button: 'Get yours',
      note: 'Two-year warranty · Ships in 24h',
    },
    meta: {
      description: `${b} Pulse ANC wireless headphones — 60-hour battery, adaptive noise cancelling, 40mm drivers. ${TAGLINE}`,
    },
  }),

  watch: (b) => ({
    modelName: 'Chrono 01',
    category: 'Smart chronograph',
    price: 429,
    heroEyebrow: 'New — Chrono 01',
    heroNote: 'Sapphire. Titanium. Two weeks of battery.',
    intro: {
      eyebrow: '01 — The icon',
      title: 'Time, sharpened.',
      body: `The ${b} Chrono 01 machines a grade-5 titanium case to a 0.01mm tolerance, then seals it behind scratch-proof sapphire. Built for the wrist that never stops.`,
      stats: [
        ['14d', 'Battery life'],
        ['100m', 'Water resistance'],
      ],
    },
    callouts: [
      {
        title: 'Sapphire crystal',
        body: 'Second only to diamond in hardness. Keys, concrete, chaos — not a scratch.',
        anchor: 'dial',
        fallback: [0, 0.05, 0.5],
        view: { rot: [0.1, -0.2, 0], dir: [0.1, 0.1, 1], dist: 3.8 },
        side: 'left',
      },
      {
        title: 'Precision crown',
        body: 'A knurled titanium crown with haptic clicks, for navigation that feels mechanical.',
        anchor: 'crown',
        fallback: [0.5, 0.05, 0],
        view: { rot: [0, -0.7, 0], dir: [0.7, 0.1, 1], dist: 3.6 },
        side: 'left',
      },
      {
        title: 'FKM sport strap',
        body: 'Fluoroelastomer that shrugs off sweat, salt and sunscreen. Quick-swap in one click.',
        anchor: 'strap',
        fallback: [0, -0.45, 0.2],
        view: { rot: [0.4, 0.3, 0], dir: [-0.1, -0.3, 1], dist: 4.2 },
        side: 'right',
      },
    ],
    layers: {
      eyebrow: '04 — Anatomy',
      title: 'Assembled to the micron.',
      items: ['Sapphire crystal', 'Grade-5 titanium case', 'Hybrid movement', 'Precision crown', 'FKM sport strap'],
      marquee: 'MACHINED TO THE MICRON',
    },
    specs: {
      eyebrow: '05 — By the numbers',
      title: 'Every second counts.',
      items: [
        { value: 14, suffix: 'd', label: 'Battery life' },
        { value: 100, suffix: 'm', label: 'Water resistance' },
        { value: 42, suffix: 'mm', label: 'Case diameter' },
        { value: 38, suffix: 'g', label: 'Case weight' },
        { value: 9, suffix: 'H', label: 'Sapphire hardness' },
        { value: 120, suffix: '+', label: 'Sport modes' },
      ],
    },
    cta: {
      title: 'Make every second count.',
      body: 'Free express shipping and 30-day returns.',
      button: 'Get yours',
      note: 'Two-year warranty · Ships in 24h',
    },
    meta: {
      description: `${b} Chrono 01 — titanium smart chronograph with sapphire crystal and 14-day battery. ${TAGLINE}`,
    },
  }),
};

/** Generic copy for any product without a preset. */
const generic = (b, p) => ({
  modelName: 'One',
  category: cap(p),
  price: 199,
  heroEyebrow: `New — ${b} One`,
  heroNote: `The ${p} we always wanted. So we built it.`,
  intro: {
    eyebrow: '01 — The design',
    title: 'Designed without compromise.',
    body: `The ${b} One rethinks the ${p} from the ground up: premium materials, obsessive detailing and a shape you will recognize from across the room.`,
    stats: [
      ['100%', 'Obsessive detail'],
      ['2yr', 'Warranty'],
    ],
  },
  callouts: [
    { title: 'Premium build', body: `Materials chosen to age beautifully. This ${p} only gets better with time.`, anchor: 'a', fallback: [0.3, 0.3, 0.5], view: { rot: [0, -0.4, 0], dir: [0.3, 0.3, 1], dist: 4.2 }, side: 'left' },
    { title: 'Smart details', body: 'Every edge, seam and surface considered, so it just works.', anchor: 'b', fallback: [-0.35, -0.1, 0.5], view: { rot: [0, 0.5, 0], dir: [-0.3, 0, 1], dist: 3.8 }, side: 'right' },
    { title: 'Built to last', body: 'Stress-tested far beyond everyday life, then tested again.', anchor: 'c', fallback: [0.2, -0.45, 0.3], view: { rot: [0.4, -0.3, 0], dir: [0.2, -0.4, 1], dist: 4.2 }, side: 'left' },
  ],
  layers: {
    eyebrow: '04 — Anatomy',
    title: 'Every layer considered.',
    items: ['Outer shell', 'Structural core', 'Precision hardware', 'Comfort layer', 'Protective base'],
    marquee: `${b} ${p.toUpperCase()}`,
  },
  specs: {
    eyebrow: '05 — By the numbers',
    title: 'The numbers speak.',
    items: [
      { value: 2, suffix: 'yr', label: 'Warranty' },
      { value: 30, suffix: 'd', label: 'Free returns' },
      { value: 100, suffix: '%', label: 'Quality checked' },
      { value: 24, suffix: 'h', label: 'Dispatch' },
      { value: 4, suffix: '', label: 'Colorways' },
      { value: 1, suffix: 'M+', label: 'Happy owners' },
    ],
  },
  cta: { title: 'Make it yours.', body: 'Free express shipping and 30-day returns.', button: 'Get yours', note: 'Ships in 24h' },
  meta: { description: `${b} One — the ${p}, reimagined. ${TAGLINE}` },
});

/** Turn any hex color into a punchy colorway name. */
export function colorName(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
  const max = Math.max(r, g, bl), min = Math.min(r, g, bl), l = (max + min) / 2, d = max - min;
  if (d < 0.08) return l > 0.85 ? 'Ghost' : l < 0.15 ? 'Stealth' : 'Concrete';
  let h;
  if (max === r) h = ((g - bl) / d) % 6;
  else if (max === g) h = (bl - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const names = [
    [12, 'Ember'], [35, 'Blaze'], [55, 'Solar'], [80, 'Acid'], [150, 'Volt Green'],
    [200, 'Glacier'], [250, 'Cobalt'], [290, 'Ultra Violet'], [335, 'Flare'], [360, 'Ember'],
  ];
  return names.find(([max]) => h < max)[1];
}

const preset = (PRESETS[PRODUCT.toLowerCase()] || ((b) => generic(b, PRODUCT.toLowerCase())))(brandTitle);

export const COPY = {
  ...preset,
  brand: BRAND_NAME,
  brandTitle,
  product: PRODUCT.toLowerCase(),
  tagline: TAGLINE,
  fullName: `${brandTitle} ${preset.modelName}`,
  colorways: COLOR_VARIANTS.map((hex) => ({ hex, name: colorName(hex) })),
};
