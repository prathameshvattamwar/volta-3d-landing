/** Procedural smart chronograph. Dial faces +Z. */
import * as THREE from 'three';
import { ACCENT_COLOR, BRAND_NAME } from '../../config.js';
import { nextFrame, normalMapFromHeight, ribHeight } from './utils.js';

const V3 = THREE.Vector3;

/** Dial artwork drawn on a canvas (indices, brand, sub-dials). */
async function dialTexture(accent) {
  try {
    await document.fonts.load('600 40px "Clash Display"');
  } catch {}
  const s = 1024, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.translate(s / 2, s / 2);
  g.fillStyle = '#0c0c0e';
  g.beginPath();
  g.arc(0, 0, s / 2, 0, Math.PI * 2);
  g.fill();
  // Minute track
  for (let i = 0; i < 60; i++) {
    g.save();
    g.rotate((i / 60) * Math.PI * 2);
    g.fillStyle = i % 5 ? '#55555a' : '#f4f2ec';
    const w = i % 5 ? 4 : 12, h = i % 5 ? 26 : 70;
    g.fillRect(-w / 2, -s / 2 + 34, w, h);
    g.restore();
  }
  // Sub-dials
  [[-170, 60], [170, 60]].forEach(([x, y]) => {
    g.strokeStyle = '#3a3a40';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(x, y, 92, 0, Math.PI * 2);
    g.stroke();
  });
  g.fillStyle = '#f4f2ec';
  g.textAlign = 'center';
  g.font = '600 64px "Clash Display", Arial, sans-serif';
  g.fillText(BRAND_NAME, 0, -150);
  g.fillStyle = `#${accent.getHexString()}`;
  g.font = '600 30px "Clash Display", Arial, sans-serif';
  g.fillText('CHRONO 01', 0, 260);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export async function build({ onProgress = () => {} } = {}) {
  const accent = new THREE.Color(ACCENT_COLOR);
  const mats = {
    ti: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.3 }),
    bezel: new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.25, clearcoat: 1 }),
    dial: new THREE.MeshStandardMaterial({ map: await dialTexture(accent), roughness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2 }),
    strap: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.55, clearcoat: 0.25 }),
    hand: new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.35, metalness: 0.4 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }),
    crown: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.35, normalMap: normalMapFromHeight(64, ribHeight(16), 3) }),
  };
  onProgress(0.3);
  await nextFrame();

  const root = new THREE.Group();
  const caseGroup = new THREE.Group(), dialGroup = new THREE.Group(), handGroup = new THREE.Group();
  const glassGroup = new THREE.Group(), crownGroup = new THREE.Group();
  root.add(caseGroup, dialGroup, handGroup, glassGroup, crownGroup);

  // Case (lathe) faces +Z
  const prof = [[0, -0.17], [0.55, -0.17], [0.62, -0.11], [0.645, 0], [0.62, 0.1], [0.57, 0.15], [0.5, 0.15]].map(([r, y]) => new THREE.Vector2(r, y));
  caseGroup.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96).rotateX(Math.PI / 2), mats.ti));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 16, 96), mats.bezel);
  bezel.position.z = 0.16;
  glassGroup.add(bezel);
  // Lugs
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.12), mats.ti);
    lug.position.set(sx * 0.3, sy * 0.62, -0.03);
    caseGroup.add(lug);
  }

  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.5, 96), mats.dial);
  dial.position.z = 0.135;
  dialGroup.add(dial);

  const hand = (w, l, mat, angle, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.012).translate(0, l / 2 - 0.04, 0), mat);
    m.rotation.z = angle;
    m.position.z = z;
    handGroup.add(m);
  };
  hand(0.03, 0.28, mats.hand, -Math.PI * 1.65, 0.15); // ~10:10
  hand(0.022, 0.42, mats.hand, Math.PI * 0.33, 0.162);
  hand(0.008, 0.46, mats.accent, Math.PI * 0.85, 0.174);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 24).rotateX(Math.PI / 2), mats.accent);
  cap.position.z = 0.18;
  handGroup.add(cap);

  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.02, 96).rotateX(Math.PI / 2), mats.glass);
  glass.position.z = 0.19;
  glassGroup.add(glass);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 32).rotateZ(Math.PI / 2), mats.crown);
  crown.position.x = 0.7;
  crownGroup.add(crown);
  onProgress(0.6);
  await nextFrame();

  // Straps: rounded bands extruded along a curve that wraps back like a wrist
  const strapShape = new THREE.Shape();
  const w = 0.235, t = 0.035, r = 0.03;
  strapShape.moveTo(-t, -w + r);
  strapShape.lineTo(-t, w - r);
  strapShape.quadraticCurveTo(-t, w, -t + r * 0.5, w);
  strapShape.lineTo(t - r * 0.5, w);
  strapShape.quadraticCurveTo(t, w, t, w - r);
  strapShape.lineTo(t, -w + r);
  strapShape.quadraticCurveTo(t, -w, t - r * 0.5, -w);
  strapShape.lineTo(-t + r * 0.5, -w);
  strapShape.quadraticCurveTo(-t, -w, -t, -w + r);
  const strapGroups = [];
  for (const sy of [1, -1]) {
    const path = new THREE.CatmullRomCurve3([
      new V3(0, sy * 0.6, -0.05), new V3(0, sy * 0.95, -0.12), new V3(0, sy * 1.25, -0.38), new V3(0, sy * 1.42, -0.75),
    ]);
    const geo = new THREE.ExtrudeGeometry(strapShape, { steps: 48, bevelEnabled: false, extrudePath: path });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mats.strap));
    root.add(g);
    strapGroups.push({ obj: g, dir: new V3(0, sy * 0.4, -0.1) });
  }
  onProgress(1);

  return {
    object: root,
    parts: [
      { obj: glassGroup, dir: new V3(0, 0, 0.75) },
      { obj: handGroup, dir: new V3(0, 0, 0.5) },
      { obj: dialGroup, dir: new V3(0, 0, 0.25) },
      { obj: crownGroup, dir: new V3(0.45, 0, 0) },
      ...strapGroups,
    ],
    anchors: { dial: new V3(0.18, 0.22, 0.2), crown: new V3(0.76, 0, 0), strap: new V3(0, -1.15, -0.25) },
    setColor: (c) => {
      mats.strap.color.copy(c);
      mats.accent.color.copy(c);
    },
  };
}
