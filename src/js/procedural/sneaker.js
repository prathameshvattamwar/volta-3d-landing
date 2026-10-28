/**
 * Procedural sneaker — built entirely from code, no model file needed.
 *
 * Coordinates (before auto-scaling): X = heel(-1.4) → toe(+1.4), Y = up, Z = width (+Z = outer side).
 *
 * Parts: outsole (tread) · midsole (sculpted foam) · VoltCell heel unit · knit upper + lining
 *        · heel counter · toe rand · lightning stripes · padded collar · tongue · laces + eyelets · pull tab
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ACCENT_COLOR } from '../../config.js';
import {
  clamp, lerp, smooth, interp, HALF_PI, nextFrame,
  gridGeometry, weldSeam, capGeometry, normalMapFromHeight, knitHeight, treadHeight,
} from './utils.js';

const V3 = THREE.Vector3;

// ---------- Footprint (top view) ----------
const OUTLINE = [
  [-1.4, 0], [-1.37, 0.19], [-1.24, 0.34], [-0.95, 0.42], [-0.5, 0.4], [-0.05, 0.43], [0.45, 0.51], [0.9, 0.5],
  [1.2, 0.4], [1.36, 0.22], [1.41, 0], [1.36, -0.2], [1.18, -0.37], [0.85, -0.47], [0.4, -0.46], [-0.05, -0.35],
  [-0.5, -0.32], [-0.95, -0.38], [-1.24, -0.32], [-1.37, -0.17],
];

// ---------- Sole profile ----------
const S = (x) => 0.14 * smooth(0.5, 1.45, x) ** 1.6 + 0.045 * smooth(-1.15, -1.45, x); // toe spring + heel bevel
const T = (x) => lerp(0.4, 0.21, smooth(-0.9, 1.1, x)); // midsole stack (thicker at heel)
const BASE = (x) => S(x) + T(x) - 0.05; // where the upper starts

// ---------- Upper profile ----------
const HX = [-1.5, -1.05, -0.55, 0.0, 0.45, 0.95, 1.5];
const HY = [0.74, 0.78, 0.7, 0.6, 0.47, 0.36, 0.3];
const H = (x) => interp(HX, HY, x); // upper height above BASE along the spine
const XH = -0.95, XT = 0.95; // spine segment the upper "domes" around
const EXP = 0.55; // >1 = round, <1 = boxier walls with a flatter top

/** Point on the upper surface for footprint point P at angle a (0 = bottom edge, π/2 = top ridge). */
function upperPoint(P, a, out = new V3(), shrink = 1) {
  a = Math.min(a, HALF_PI);
  const qx = clamp(P.x, XH, XT);
  const c = Math.cos(a) ** EXP * shrink, s = Math.sin(a);
  return out.set(qx + (P.x - qx) * c, lerp(BASE(P.x), BASE(qx), s) + H(qx) * s * shrink, P.z * c);
}

/** Approximate outward normal of the upper at (P, a). */
function upperNormal(P, a, out = new V3()) {
  const qx = clamp(P.x, XH, XT);
  const dx = P.x - qx, dz = P.z, dl = Math.hypot(dx, dz) || 1;
  return out.set((dx / dl) * Math.cos(a) / dl, Math.sin(a) / H(qx), (dz / dl) * Math.cos(a) / dl).normalize();
}

/** Top-view shape of the ankle opening + lacing throat (signed distance; < 0 = inside). */
function openingSD(x, z) {
  const sdE = (Math.hypot((x + 0.66) / 0.36, z / 0.3) - 1) * 0.3;
  const t = clamp((x + 0.66) / 0.98, 0, 1);
  const sdC = Math.hypot(x - clamp(x, -0.66, 0.32), z) - lerp(0.17, 0.07, t);
  return Math.min(sdE, sdC);
}

/** Highest angle a column of the upper reaches before it hits the opening. */
function aMax(P) {
  const p = new V3();
  let prev = 0;
  for (let k = 1; k <= 48; k++) {
    const a = (k / 48) * HALF_PI;
    upperPoint(P, a, p);
    if (openingSD(p.x, p.z) < 0) {
      let lo = prev, hi = a;
      for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) / 2;
        upperPoint(P, mid, p);
        if (openingSD(p.x, p.z) < 0) hi = mid;
        else lo = mid;
      }
      return lo;
    }
    prev = a;
  }
  return HALF_PI;
}

/** Ring-lofted solid (midsole / outsole): wall profile `off(t)`, height `y(x, t)`. */
function loftSole(pts, normals, rings, off, y) {
  return gridGeometry(pts.length, rings, (i, j, out) => {
    const k = i % pts.length, t = j / rings, P = pts[k], n = normals[k];
    const o = off(t);
    out.set(P.x + n.x * o, y(P.x, t), P.z + n.z * o);
    return [i / pts.length * 12, t];
  });
}

export async function build({ onProgress = () => {} } = {}) {
  const accentColor = new THREE.Color(ACCENT_COLOR);

  // ---------- Materials ----------
  const knitTex = normalMapFromHeight(256, knitHeight(16), 3, 2.6);
  const treadTex = normalMapFromHeight(128, treadHeight(5), 4, 1.6);

  const mats = {
    knit: new THREE.MeshPhysicalMaterial({
      color: 0x161618, roughness: 0.9, sheen: 0.8, sheenRoughness: 0.45, sheenColor: 0x3c3c40,
      normalMap: knitTex, normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    lining: new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8, side: THREE.BackSide }),
    foam: new THREE.MeshPhysicalMaterial({ color: 0xf2efe7, roughness: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: accentColor, roughness: 0.55, clearcoat: 0.2 }),
    tread: new THREE.MeshPhysicalMaterial({ color: accentColor, roughness: 0.7, normalMap: treadTex, normalScale: new THREE.Vector2(1.4, 1.4) }),
    accent: new THREE.MeshPhysicalMaterial({ color: accentColor, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    tpu: new THREE.MeshPhysicalMaterial({ color: 0x101012, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 }),
    collar: new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.7, sheen: 0.45, sheenColor: 0x404044 }),
    lace: new THREE.MeshStandardMaterial({ color: 0xf2efe7, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 1, roughness: 0.28 }),
    cell: new THREE.MeshPhysicalMaterial({
      color: accentColor, emissive: accentColor, emissiveIntensity: 0.35, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
    }),
  };

  const root = new THREE.Group();
  root.name = 'sneaker';
  const mesh = (geo, mat, parent) => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };

  // ---------- Footprint samples ----------
  const curve = new THREE.CatmullRomCurve3(OUTLINE.map(([x, z]) => new V3(x, 0, z)), true, 'centripetal');
  const N = 160;
  const pts = curve.getSpacedPoints(N).slice(0, N);
  const normals = pts.map((_, i) => {
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
    return new V3(-(b.z - a.z), 0, b.x - a.x).normalize(); // outward in XZ
  });

  // ---------- Outsole ----------
  const soleGroup = new THREE.Group();
  const outsoleGroup = new THREE.Group();
  root.add(soleGroup, outsoleGroup);
  {
    const off = (t) => 0.014 + 0.006 * Math.sin(Math.PI * t) - 0.012 * (1 - t) ** 3;
    const side = loftSole(pts, normals, 4, off, (x, t) => S(x) - 0.055 + t * 0.07);
    const outlineOut = pts.map((P, i) => new V3(P.x + normals[i].x * off(0), 0, P.z + normals[i].z * off(0)));
    const bottom = capGeometry(outlineOut, (x) => S(x) - 0.055, false, 1);
    const geo = mergeGeometries([side, bottom], true);
    mesh(geo, [mats.rubber, mats.tread], outsoleGroup);
  }
  onProgress(0.15);
  await nextFrame();

  // ---------- Midsole (with a sculpted groove) ----------
  {
    const off = (t) => 0.03 * Math.sin(Math.PI * t) - 0.025 * (1 - t) ** 4 - 0.012 * Math.exp(-(((t - 0.6) / 0.06) ** 2));
    const side = loftSole(pts, normals, 14, off, (x, t) => S(x) + t * T(x));
    const top = capGeometry(pts, (x) => S(x) + T(x), true);
    const bottom = capGeometry(pts.map((P, i) => new V3(P.x + normals[i].x * off(0), 0, P.z + normals[i].z * off(0))), (x) => S(x), false);
    mesh(mergeGeometries([side, top, bottom]), mats.foam, soleGroup);
  }

  // ---------- VoltCell heel unit ----------
  const cellGroup = new THREE.Group();
  root.add(cellGroup);
  const cellX = -0.9, cellY = S(-0.9) + T(-0.9) * 0.45;
  const wallZ = (side) => {
    const P = pts.filter((p) => p.z * side > 0).reduce((a, b) => (Math.abs(b.x - cellX) < Math.abs(a.x - cellX) ? b : a));
    return P.z + side * 0.02;
  };
  {
    const geo = new THREE.CapsuleGeometry(0.075, 0.38, 10, 32).rotateZ(HALF_PI).scale(1, 1, 0.5);
    for (const side of [1, -1]) {
      const m = mesh(geo, mats.cell, cellGroup);
      m.position.set(cellX, cellY, wallZ(side));
      m.rotation.y = side * -0.12; // follow the curve of the heel
    }
  }
  onProgress(0.3);
  await nextFrame();

  // ---------- Knit upper + lining ----------
  const upperGroup = new THREE.Group();
  root.add(upperGroup);
  const inset = pts.map((P, i) => new V3(P.x - normals[i].x * 0.015, 0, P.z - normals[i].z * 0.015));
  const cols = inset.map((P) => ({ P, aMax: aMax(P) }));
  const M = 28;
  const rowA = (col, j) => col.aMax * (1 - (1 - j / M) ** 1.6); // more rows near the top
  {
    // arc-length UVs so the knit texture has an even scale
    const uAt = [0];
    for (let i = 1; i <= N; i++) uAt.push(uAt[i - 1] + inset[i % N].distanceTo(inset[i - 1]));
    const vCache = new Map();
    const prev = new V3();
    const surf = (shrink) => (i, j, out) => {
      const col = cols[i % N];
      upperPoint(col.P, rowA(col, j), out, shrink);
      let v = 0;
      if (j > 0) {
        upperPoint(col.P, rowA(col, j - 1), prev, shrink);
        v = vCache.get(`${shrink}:${i}:${j - 1}`) + out.distanceTo(prev);
      }
      vCache.set(`${shrink}:${i}:${j}`, v);
      return [uAt[i], v];
    };
    const upper = gridGeometry(N, M, surf(1));
    weldSeam(upper, N, M);
    mesh(upper, mats.knit, upperGroup);

    const lining = gridGeometry(N, M, surf(0.965));
    weldSeam(lining, N, M);
    mesh(lining, mats.lining, upperGroup);
  }
  onProgress(0.5);
  await nextFrame();

  // Helper: find a point on one side of the footprint at a given x (side = +1 outer / -1 inner)
  const sideSamples = (side) => inset.filter((P) => P.z * side > 0.02).sort((a, b) => a.x - b.x);
  const sides = { 1: sideSamples(1), [-1]: sideSamples(-1) };
  const sideP = (x, side) => {
    const arr = sides[side];
    let k = 0;
    while (k < arr.length - 2 && arr[k + 1].x < x) k++;
    const a = arr[k], b = arr[k + 1];
    const t = clamp((x - a.x) / (b.x - a.x), 0, 1);
    return new V3(lerp(a.x, b.x, t), 0, lerp(a.z, b.z, t));
  };

  // Overlay patch on the upper surface (offset outward a touch)
  const patchPoint = (P, a, off, out) => {
    upperPoint(P, a, out);
    return out.addScaledVector(upperNormal(P, a), off);
  };

  // ---------- Lightning stripes (both sides) ----------
  {
    const x0 = -0.92, x1 = 0.86, xm = -0.02;
    for (const side of [1, -1]) {
      const geo = gridGeometry(48, 4, (i, j, out) => {
        const x = lerp(x0, x1, i / 48), f = i / 48;
        const P = sideP(x, side);
        const kink = 0.13 * (0.5 - smooth(xm - 0.05, xm + 0.05, x)); // the "bolt" step
        const ac = lerp(0.98, 0.34, f) + kink;
        const w = lerp(0.34, 0.015, f ** 1.2);
        const a = Math.min(ac + (j / 4 - 0.5) * w, aMax(P) - 0.08);
        patchPoint(P, Math.max(a, 0.05), 0.009, out);
        return [f, j / 4];
      }, { flip: side < 0 });
      mesh(geo, mats.accent, upperGroup);
    }
  }

  // ---------- Heel counter + toe rand (glossy TPU overlays) ----------
  {
    const heelIdx = [];
    for (let k = -30; k <= 30; k++) heelIdx.push((k + N) % N);
    const heel = gridGeometry(heelIdx.length - 1, 8, (i, j, out) => {
      const col = cols[heelIdx[i]];
      const e = Math.abs(i / (heelIdx.length - 1) - 0.5) * 2; // 0 at the back, 1 at the front edges
      const top = lerp(Math.min(1.05, col.aMax - 0.14), 0.12, smooth(0.35, 1, e) ** 0.8);
      patchPoint(col.P, (j / 8) * top, 0.012, out);
      return [i, j];
    });
    mesh(heel, mats.tpu, upperGroup);

    const toeIdx = [];
    const toeK = pts.reduce((best, P, k) => (P.x > pts[best].x ? k : best), 0);
    for (let k = -26; k <= 26; k++) toeIdx.push((toeK + k + N) % N);
    const toe = gridGeometry(toeIdx.length - 1, 5, (i, j, out) => {
      const col = cols[toeIdx[i]];
      const e = Math.abs(i / (toeIdx.length - 1) - 0.5) * 2;
      const top = lerp(0.42, 0.1, smooth(0.5, 1, e));
      patchPoint(col.P, (j / 5) * top, 0.01, out);
      return [i, j];
    });
    mesh(toe, mats.tpu, upperGroup);
  }
  onProgress(0.65);
  await nextFrame();

  // ---------- Padded collar around the opening ----------
  const edge = (col) => upperPoint(col.P, col.aMax);
  {
    const cut = cols.map((c) => c.aMax < HALF_PI - 0.002);
    let start = cut.findIndex((c) => !c);
    const ring = [];
    for (let k = 1; k <= N; k++) {
      const i = (start + k) % N;
      if (cut[i]) ring.push(edge(cols[i]));
      else if (ring.length) break;
    }
    const collarCurve = new THREE.CatmullRomCurve3(ring, true, 'centripetal');
    mesh(new THREE.TubeGeometry(collarCurve, 240, 0.048, 12, true), mats.collar, upperGroup);
  }

  // ---------- Pull tab ----------
  {
    const back = edge(cols[0]);
    const tab = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 28, Math.PI), mats.accent);
    tab.position.copy(back).add(new V3(0.02, -0.02, 0));
    tab.rotation.z = 0.55;
    upperGroup.add(tab);
  }

  // ---------- Tongue ----------
  const tongueGroup = new THREE.Group();
  root.add(tongueGroup);
  const ridge = (x) => BASE(x) + H(x);
  const tongueY = (x, z) => ridge(x) + lerp(-0.02, 0.014, smooth(0.38, 0.22, x)) + 0.2 * smooth(-0.42, -0.72, x) ** 1.2 - 1.2 * z * z;
  {
    const geo = gridGeometry(40, 12, (i, j, out) => {
      const t = i / 40;
      const x = lerp(0.38, -0.72, t) - 0.06 * t ** 3;
      let hw = lerp(0.12, 0.27, t);
      hw *= Math.sqrt(1 - smooth(0.82, 1.0, t) ** 2 * 0.85); // rounded top
      const z = (j / 12 - 0.5) * 2 * hw;
      out.set(x, tongueY(x, z), z);
      return [t * 3, j / 12];
    });
    const tongueMat = mats.collar.clone();
    tongueMat.side = THREE.DoubleSide;
    mesh(geo, tongueMat, tongueGroup);
    // Accent tag at the top of the tongue
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.16), mats.accent);
    const tx = -0.71;
    tag.position.set(tx + 0.01, tongueY(tx, 0) - 0.05, 0);
    tag.rotation.z = 0.5;
    tongueGroup.add(tag);
  }
  onProgress(0.8);
  await nextFrame();

  // ---------- Laces + eyelets ----------
  const laceGroup = new THREE.Group();
  root.add(laceGroup);
  {
    const ringPts = { 1: [], [-1]: [] };
    cols.forEach((c) => {
      if (c.aMax < HALF_PI - 0.002 && c.P.x > -0.5 && c.P.x < 0.38) ringPts[Math.sign(c.P.z)]?.push(edge(c));
    });
    for (const s of [1, -1]) ringPts[s].sort((a, b) => a.x - b.x);
    const edgeAt = (x, s) => {
      const arr = ringPts[s];
      let k = 0;
      while (k < arr.length - 2 && arr[k + 1].x < x) k++;
      const a = arr[k], b = arr[k + 1];
      return a.clone().lerp(b, clamp((x - a.x) / (b.x - a.x), 0, 1));
    };
    const eyeletGeo = new THREE.TorusGeometry(0.026, 0.009, 8, 20);
    const laceXs = [-0.4, -0.25, -0.1, 0.05, 0.19];
    const zAxis = new V3(0, 0, 1);
    laceXs.forEach((x) => {
      const L = edgeAt(x, 1), R = edgeAt(x, -1);
      const ends = [L, R].map((E) => {
        const n = E.clone().sub(new V3(E.x, E.y - 0.25, 0)).normalize();
        const top = E.clone().addScaledVector(n, 0.05); // on top of the collar tube
        const ring = new THREE.Mesh(eyeletGeo, mats.metal);
        ring.position.copy(top);
        ring.quaternion.setFromUnitVectors(zAxis, n);
        laceGroup.add(ring);
        return top;
      });
      const midX = (L.x + R.x) / 2;
      const mid = new V3(midX, Math.max(tongueY(midX, 0), ends[0].y) + 0.09, 0);
      const c = new THREE.QuadraticBezierCurve3(ends[0], mid, ends[1]);
      mesh(new THREE.TubeGeometry(c, 20, 0.026, 8, false), mats.lace, laceGroup);
    });
  }
  onProgress(0.95);

  // ---------- Exploded-view directions ----------
  const parts = [
    { obj: outsoleGroup, dir: new V3(0, -0.6, 0) },
    { obj: soleGroup, dir: new V3(0, -0.28, 0) },
    { obj: cellGroup, dir: new V3(-0.15, -0.32, 0) },
    { obj: upperGroup, dir: new V3(0, 0.14, 0) },
    { obj: tongueGroup, dir: new V3(-0.06, 0.48, 0) },
    { obj: laceGroup, dir: new V3(0, 0.8, 0) },
  ];

  // ---------- Callout anchor points ----------
  const anchors = {
    upper: patchPoint(sideP(0.25, 1), 0.72, 0, new V3()),
    heel: new V3(cellX, cellY, wallZ(1) + 0.04),
    outsole: new V3(1.05, S(1.05) - 0.04, 0.34),
  };

  const tinted = [mats.lining, mats.rubber, mats.tread, mats.accent, mats.cell];
  const setColor = (color) => {
    tinted.forEach((m) => m.color.copy(color));
    mats.cell.emissive.copy(color);
  };

  return { object: root, parts, anchors, setColor };
}
