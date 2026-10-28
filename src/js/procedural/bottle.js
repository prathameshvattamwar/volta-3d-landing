/** Procedural premium bottle — the fallback for any PRODUCT without its own builder. */
import * as THREE from 'three';
import { ACCENT_COLOR, BRAND_NAME } from '../../config.js';
import { nextFrame, normalMapFromHeight, ribHeight } from './utils.js';

const V3 = THREE.Vector3;

async function labelTexture() {
  try {
    await document.fonts.load('700 40px "Clash Display"');
  } catch {}
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#0a0a0a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 150px "Clash Display", Arial, sans-serif';
  g.fillText(BRAND_NAME, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function build({ onProgress = () => {} } = {}) {
  const accent = new THREE.Color(ACCENT_COLOR);
  const mats = {
    body: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.4, normalMap: normalMapFromHeight(64, ribHeight(24), 3) }),
    label: new THREE.MeshStandardMaterial({ map: await labelTexture(), roughness: 0.6 }),
  };
  onProgress(0.5);
  await nextFrame();

  const prof = [[0, -1.3], [0.5, -1.3], [0.58, -1.24], [0.6, -1.1], [0.6, 0.35], [0.56, 0.6], [0.4, 0.85], [0.24, 0.98], [0.22, 1.1]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const root = new THREE.Group();
  const bodyG = new THREE.Group(), capG = new THREE.Group(), labelG = new THREE.Group();
  root.add(bodyG, capG, labelG);
  bodyG.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), mats.body));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 64), mats.cap);
  cap.position.y = 1.25;
  capG.add(cap);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.605, 0.605, 0.8, 96, 1, true), mats.label);
  label.position.y = -0.35;
  labelG.add(label);
  onProgress(1);

  return {
    object: root,
    parts: [
      { obj: capG, dir: new V3(0, 0.6, 0) },
      { obj: labelG, dir: new V3(0, 0, 0.45) },
    ],
    anchors: { a: new V3(0.2, 1.3, 0.2), b: new V3(0, -0.2, 0.61), c: new V3(0.3, -1.25, 0.45) },
    setColor: (c) => mats.body.color.copy(c),
  };
}
