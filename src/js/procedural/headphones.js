/** Procedural over-ear headphones. X = left/right, Y = up, Z = toward camera. */
import * as THREE from 'three';
import { ACCENT_COLOR } from '../../config.js';
import { lerp, nextFrame, normalMapFromHeight, knitHeight } from './utils.js';

const V3 = THREE.Vector3;

class Arc extends THREE.Curve {
  constructor(r, cy, a0, a1, squash = 1.05) {
    super();
    Object.assign(this, { r, cy, a0, a1, squash });
  }
  getPoint(t, out = new V3()) {
    const a = lerp(this.a0, this.a1, t);
    return out.set(Math.cos(a) * this.r, Math.sin(a) * this.r * this.squash + this.cy, 0);
  }
}

/** Rounded "puck" profile for the ear cups, revolved around Y. */
function puckProfile(r, h, round) {
  const pts = [new THREE.Vector2(0, -h)];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    pts.push(new THREE.Vector2(r - round + Math.cos(a) * round, Math.sin(a) * (h - 0.01) * 1.0));
  }
  pts.push(new THREE.Vector2(0, h));
  return pts;
}

export async function build({ onProgress = () => {} } = {}) {
  const accent = new THREE.Color(ACCENT_COLOR);
  const mats = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0x18181b, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    accent: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    leather: new THREE.MeshPhysicalMaterial({ color: 0x232327, roughness: 0.62, sheen: 0.6, sheenColor: 0x555555 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xd0d3d7, metalness: 1, roughness: 0.25 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.9, normalMap: normalMapFromHeight(128, knitHeight(12), 2, 3) }),
  };

  const root = new THREE.Group();
  const bandGroup = new THREE.Group();
  const yokeGroup = new THREE.Group();
  root.add(bandGroup, yokeGroup);

  // Headband (flattened tube) + cushion underneath
  const R = 1.05, CY = 0.15;
  const band = new THREE.TubeGeometry(new Arc(R, CY, -0.17, Math.PI + 0.17), 96, 0.06, 14).scale(1, 1, 2.4);
  bandGroup.add(new THREE.Mesh(band, mats.shell));
  const cushion = new THREE.TubeGeometry(new Arc(R - 0.1, CY, 0.55, Math.PI - 0.55), 64, 0.055, 12).scale(1, 1, 2.0);
  bandGroup.add(new THREE.Mesh(cushion, mats.leather));
  const topStripe = new THREE.TubeGeometry(new Arc(R + 0.055, CY, 0.9, Math.PI - 0.9), 48, 0.012, 6).scale(1, 1, 8);
  bandGroup.add(new THREE.Mesh(topStripe, mats.accent));
  onProgress(0.3);
  await nextFrame();

  const parts = [{ obj: bandGroup, dir: new V3(0, 0.5, 0) }, { obj: yokeGroup, dir: new V3(0, 0.22, 0) }];
  const cupGeo = new THREE.LatheGeometry(puckProfile(0.48, 0.17, 0.08), 64).rotateZ(Math.PI / 2);

  for (const s of [-1, 1]) {
    const C = new V3(s * 1.0, -0.62, 0);

    // Yoke: half ring around the cup + slider
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.024, 10, 40, Math.PI), mats.metal);
    yoke.rotation.y = Math.PI / 2;
    yoke.position.copy(C);
    const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 16), mats.metal);
    slider.position.set(s * 1.02, -0.02, 0);
    yokeGroup.add(yoke, slider);

    // Cup + accent cap + metal ring
    const cupGroup = new THREE.Group();
    const cup = new THREE.Mesh(cupGeo, mats.shell);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 64).rotateZ(Math.PI / 2), mats.accent);
    cap.position.x = s * 0.17;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.012, 8, 64).rotateY(Math.PI / 2), mats.metal);
    ring.position.x = s * 0.175;
    cupGroup.add(cup, cap, ring);
    cupGroup.position.copy(C);
    root.add(cupGroup);

    // Cushion facing inward
    const cushGroup = new THREE.Group();
    const cush = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 18, 56).rotateY(Math.PI / 2).scale(0.8, 1, 1), mats.leather);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48).rotateY(-s * Math.PI / 2), mats.fabric);
    mesh.position.x = 0.02 * s;
    cushGroup.add(cush, mesh);
    cushGroup.position.set(C.x - s * 0.2, C.y, 0);
    root.add(cushGroup);

    parts.push({ obj: cupGroup, dir: new V3(s * 0.45, 0, 0) }, { obj: cushGroup, dir: new V3(-s * 0.35, 0, 0) });
  }
  onProgress(1);

  return {
    object: root,
    parts,
    anchors: {
      cushion: new V3(0.8, -0.62, 0.36),
      cup: new V3(-1.19, -0.62, 0),
      band: new V3(0, CY + R * 1.05 + 0.06, 0),
    },
    setColor: (c) => mats.accent.color.copy(c),
  };
}
