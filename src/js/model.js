/**
 * Product loader.
 *  1. If /public/models/product.glb exists → load it (Draco + Meshopt supported).
 *  2. Otherwise → build a procedural model for PRODUCT.
 *
 * Every product is returned in the same shape:
 *  {
 *    object,          THREE.Object3D, centered and scaled to MODEL.size
 *    bottom,          lowest Y (for the contact shadow floor)
 *    anchors,         { name: Object3D } points for the feature callouts
 *    setColor(color), recolor for the colorway section (THREE.Color)
 *    setExplode(t),   0..1 exploded view
 *  }
 */
import * as THREE from 'three';
import { MODEL, PRODUCT } from '../config.js';
import { COPY } from '../copy.js';

const PROCEDURAL = {
  sneaker: () => import('./procedural/sneaker.js'),
  headphones: () => import('./procedural/headphones.js'),
  watch: () => import('./procedural/watch.js'),
  bottle: () => import('./procedural/bottle.js'),
};

/** Check for a real .glb (dev servers answer missing files with index.html, so check the content type too). */
async function glbExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    return res.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

export async function loadProduct(onProgress = () => {}) {
  let built;
  if (await glbExists(MODEL.url)) {
    built = await loadGLB(MODEL.url, onProgress);
  } else {
    const key = PRODUCT.toLowerCase();
    const mod = await (PROCEDURAL[key] || PROCEDURAL.bottle)();
    onProgress(0.4);
    built = await mod.build({ onProgress: (p) => onProgress(0.4 + p * 0.6) });
  }
  onProgress(1);
  return normalize(built);
}

/**
 * Center + scale the model and turn anchor definitions into Object3Ds.
 * `built` = { object, anchors?, parts?, setColor? }
 */
function normalize(built) {
  const { object } = built;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const dims = box.getSize(new THREE.Vector3());
  const scale = MODEL.size / Math.max(dims.x, dims.y, dims.z);

  const holder = new THREE.Group();
  holder.name = 'product';
  holder.scale.setScalar(scale);
  object.position.sub(center);
  holder.add(object);

  // Anchors: named points from the procedural model, or bounding-box coords for a .glb
  const anchors = {};
  COPY.callouts.forEach((c) => {
    const a = new THREE.Object3D();
    const named = built.anchors?.[c.anchor];
    if (named) a.position.copy(named).sub(center);
    else a.position.set(...c.fallback).multiply(dims);
    holder.add(a);
    anchors[c.anchor] = a;
  });

  // Exploded view: each part slides along its own direction
  const parts = (built.parts || []).map((p) => ({ obj: p.obj, base: p.obj.position.clone(), dir: p.dir }));
  let lastExplode = -1;
  const setExplode = (t) => {
    if (Math.abs(t - lastExplode) < 1e-4) return;
    lastExplode = t;
    const k = t * t * (3 - 2 * t); // smoothstep for a softer pop
    for (const p of parts) p.obj.position.copy(p.base).addScaledVector(p.dir, k);
  };

  return {
    object: holder,
    bottom: (box.min.y - center.y) * scale,
    anchors,
    setColor: built.setColor || (() => {}),
    setExplode,
  };
}

/* ---------------------------------------------------------------- */
/*  .glb loading (code-split: only downloaded when a model exists)  */
/* ---------------------------------------------------------------- */
async function loadGLB(url, onProgress) {
  const [{ GLTFLoader }, { DRACOLoader, DRACO_GLTF_CONFIG }, { MeshoptDecoder }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);
  // three.js ships the Draco decoder; Vite bundles it and it's only fetched for Draco files
  const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
  const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(url, (e) => {
    if (e.total) onProgress((e.loaded / e.total) * 0.9);
  });
  draco.dispose();

  const object = gltf.scene;
  object.rotation.set(...MODEL.rotation);
  object.updateMatrixWorld(true);

  // Collect meshes
  const meshes = [];
  object.traverse((o) => {
    if (o.isMesh) {
      meshes.push(o);
      o.frustumCulled = false;
    }
  });

  // Materials to recolor
  let tint = [];
  if (MODEL.tintMaterials === 'auto') {
    const biggest = meshes.reduce((a, m) => (m.geometry.attributes.position.count > (a?.geometry.attributes.position.count || 0) ? m : a), null);
    if (biggest) tint = [].concat(biggest.material);
  } else if (Array.isArray(MODEL.tintMaterials)) {
    const names = new Set(MODEL.tintMaterials);
    meshes.forEach((m) => [].concat(m.material).forEach((mat) => names.has(mat.name) && tint.push(mat)));
  }
  tint = [...new Set(tint)];

  // Exploded view: push each mesh away from the model center
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() * 0.18;
  const parts = meshes.length > 1
    ? meshes.map((m) => {
        const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
        const worldDir = c.clone().sub(center);
        if (worldDir.lengthSq() < 1e-6) worldDir.set(0, 1, 0);
        worldDir.normalize().multiplyScalar(radius);
        // Convert the world-space direction to the mesh parent's local space
        const p0 = m.parent.worldToLocal(c.clone());
        const p1 = m.parent.worldToLocal(c.clone().add(worldDir));
        return { obj: m, dir: p1.sub(p0) };
      })
    : [];

  return {
    object,
    parts,
    setColor: (color) => tint.forEach((mat) => mat.color?.copy(color)),
  };
}
