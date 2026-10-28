/** Shared helpers for the procedural models. */
import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const HALF_PI = Math.PI / 2;

/** Smoothstep that also works when edge0 > edge1. */
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** 1D Catmull-Rom interpolation through (xs, ys). */
export function interp(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (x > xs[i + 1]) i++;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  const p0 = ys[Math.max(i - 1, 0)], p1 = ys[i], p2 = ys[i + 1], p3 = ys[Math.min(i + 2, n - 1)];
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

/** Let the browser breathe between heavy steps (keeps Total Blocking Time low). */
export const nextFrame = () => new Promise((r) => setTimeout(r, 0));

/** Tiny indexed-geometry builder. */
export class GeoBuilder {
  constructor() {
    this.p = [];
    this.uv = [];
    this.idx = [];
  }
  v(x, y, z, u = 0, v = 0) {
    this.p.push(x, y, z);
    this.uv.push(u, v);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c) {
    this.idx.push(a, b, c);
  }
  quad(a, b, c, d, flip = false) {
    if (flip) this.idx.push(a, c, b, a, d, c);
    else this.idx.push(a, b, c, a, c, d);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

/**
 * Grid surface: fn(i, j, out) fills a Vector3 and returns [u, v].
 * cols × rows quads. Faces point along (dI × dJ) unless flip.
 */
export function gridGeometry(cols, rows, fn, { flip = false } = {}) {
  const b = new GeoBuilder();
  const p = new THREE.Vector3();
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const [u, v] = fn(i, j, p);
      b.v(p.x, p.y, p.z, u, v);
    }
  }
  const at = (i, j) => i * (rows + 1) + j;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) b.quad(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1), flip);
  }
  return b.build();
}

/** Average normals of the first and last column of a closed grid so the seam is invisible. */
export function weldSeam(geo, cols, rows) {
  const n = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let j = 0; j <= rows; j++) {
    const a = j, b = cols * (rows + 1) + j;
    v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
}

/** Flat cap from a closed 2D outline (x, z), at height y(x, z). */
export function capGeometry(pts, yFn, up, uvScale = 1) {
  const contour = pts.map((p) => new THREE.Vector2(p.x, p.z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const b = new GeoBuilder();
  pts.forEach((p) => b.v(p.x, yFn(p.x, p.z), p.z, p.x * uvScale, p.z * uvScale));
  for (let [a, c, d] of tris) {
    const ax = pts[a].x, az = pts[a].z;
    const ny = (pts[c].z - az) * (pts[d].x - ax) - (pts[c].x - ax) * (pts[d].z - az);
    if (up === ny < 0) [c, d] = [d, c];
    b.tri(a, c, d);
  }
  return b.build();
}

/**
 * Build a tileable normal map from a height function h(u, v) in [0,1]².
 * Generated on a canvas at runtime → zero image downloads.
 */
export function normalMapFromHeight(size, heightFn, strength = 2, repeat = 1) {
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) hgt[y * size + x] = heightFn(x / size, y / size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

const fract = (x) => x - Math.floor(x);

/** Knit stitch pattern: rows of little "V" loops. */
export function knitHeight(cells = 16) {
  const lobe = (fu, fv, px, ang) => {
    const x = fu - px, y = fv - 0.5;
    const c = Math.cos(ang), s = Math.sin(ang);
    const rx = (x * c - y * s) / 0.2, ry = (x * s + y * c) / 0.46;
    return Math.max(0, 1 - Math.hypot(rx, ry)) ** 0.6;
  };
  return (u, v) => {
    const fu = fract(u * cells), fv = fract(v * cells);
    return Math.max(lobe(fu, fv, 0.28, 0.5), lobe(fu, fv, 0.72, -0.5));
  };
}

/** Diamond lug pattern for rubber outsoles. */
export function treadHeight(cells = 10) {
  return (u, v) => {
    const fu = fract(u * cells) - 0.5, fv = fract(v * cells) - 0.5;
    return 1 - smooth(0.26, 0.36, Math.abs(fu) + Math.abs(fv));
  };
}

/** Fine knurl/rib pattern (watch crowns, bottle caps). */
export function ribHeight(cells = 32) {
  return (u) => Math.abs(Math.sin(u * cells * Math.PI));
}
