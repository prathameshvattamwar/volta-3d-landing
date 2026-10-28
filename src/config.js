/**
 * ============================================================
 *  SITE CONFIG — the ONLY file you need to edit
 * ============================================================
 *  Change the values below, save, and the whole site (copy,
 *  colors, 3D model, meta tags) updates automatically.
 *
 *  PRODUCT presets with hand-written copy + a procedural 3D model:
 *    "sneaker" | "headphones" | "watch"
 *  Any other word (e.g. "backpack") still works: the site falls
 *  back to generic copy, and you should drop a real model in
 *  /public/models/product.glb (see MODEL below).
 * ============================================================
 */

// ==================== EDIT THESE ====================
export const PRODUCT = 'sneaker';
export const BRAND_NAME = 'VOLTA';
export const TAGLINE = 'Built for the bold.';
export const PRIMARY_COLOR = '#FFD600'; // bold background color
export const ACCENT_COLOR = '#FF3D00'; // second bold color
export const DARK_COLOR = '#0A0A0A'; // text / contrast color
export const COLOR_VARIANTS = ['#FFD600', '#3346FF', '#F7C6D9', '#B4FF00']; // colorways: Solar, Cobalt, Arctic Pink, Acid
export const REPO_NAME = 'volta-3d-landing';

// Region: currency + number formatting for prices (₹14,999 in en-IN)
export const CURRENCY = { symbol: '₹', code: 'INR', locale: 'en-IN' };
// =====================================================

/** Public URL of the deployed site (used for Open Graph / canonical tags). */
export const SITE_URL = 'https://volta-3d-landing.vercel.app';

/**
 * 3D MODEL
 * - Drop a .glb file at /public/models/product.glb and it is used automatically.
 *   (Draco- and Meshopt-compressed files are supported.)
 * - If the file is missing, a procedural model of PRODUCT is built instead.
 */
export const MODEL = {
  url: '/models/product.glb',
  /** Largest dimension of the model in world units after auto-scaling. */
  size: 3.2,
  /** Extra rotation (radians) applied to a loaded .glb so it faces the right way. [x, y, z] */
  rotation: [0, 0, 0],
  /**
   * Which material(s) of a loaded .glb get recolored by the colorway section.
   * 'auto' = the material on the biggest mesh. Or an array of material names, e.g. ['Upper', 'Laces'].
   * Use [] to disable recoloring.
   */
  tintMaterials: 'auto',
};
