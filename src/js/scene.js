/**
 * Scene: ONE renderer, ONE camera, studio lighting, contact shadows and the render loop.
 *
 * Hierarchy
 *   scene
 *    ├─ shadow  (soft contact shadow on an invisible floor; follows the rig, doesn't rotate)
 *    └─ rig     ← position + scale from the scroll pose
 *        └─ pivot   ← rotation from the scroll pose + mouse tilt + idle float
 *            └─ product (auto-centered, auto-scaled)
 *
 * Adaptive quality: if the browser renders WebGL in software (no GPU / blocklisted GPU),
 * we switch to a "lite" path (no env map, no contact shadow, simpler materials)
 * so the page stays smooth instead of freezing.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createContactShadow } from './shadow.js';

const FOV = 30;

/** True when WebGL runs on the CPU (SwiftShader, llvmpipe, Microsoft Basic Render…). */
function isSoftwareGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

export function createStage(container, env) {
  const lite = isSoftwareGL();
  const renderer = new THREE.WebGLRenderer({
    antialias: !lite,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0.3, 10);

  // ---------- Studio lighting ----------
  if (!lite) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environmentIntensity = 0.85;
    roomEnv.dispose();
    pmrem.dispose();
  }

  const key = new THREE.DirectionalLight(0xfff4e5, 2.4); // warm key, top-front-left
  key.position.set(-4, 6, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 3.2); // crisp rim from behind
  rim.position.set(5, 3, -6);
  const fill = new THREE.HemisphereLight(0xffffff, 0x444444, lite ? 1.6 : 0.5); // stands in for the env map in lite mode
  scene.add(key, rim, fill);

  // ---------- Product rig ----------
  const rig = new THREE.Group();
  const pivot = new THREE.Group();
  rig.add(pivot);
  scene.add(rig);

  // Only the lowest ~third of the product (height) darkens the floor → a soft, grounded contact shadow
  const shadow = createContactShadow(renderer, { size: 6, resolution: env.isMobile ? 256 : 512, blur: 2.2, opacity: 0.75, height: 0.7, darkness: 1.1 });
  scene.add(shadow.group); // not under the rig: cameras ignore parent scale

  let product = null;

  /** Swap in a product (from model.js). */
  function setProduct(p) {
    if (product) pivot.remove(product.object);
    product = p;
    pivot.add(p.object);
    if (lite) {
      // Cheaper shader variants: drop sheen + clearcoat
      p.object.traverse((o) => {
        [].concat(o.material || []).forEach((m) => {
          if (m.isMeshPhysicalMaterial) m.sheen = m.clearcoat = 0;
        });
      });
    }
  }

  // ---------- Sizing ----------
  const size = { w: 1, h: 1 };
  function resize() {
    size.w = container.clientWidth || window.innerWidth;
    size.h = container.clientHeight || window.innerHeight;
    const maxDpr = lite ? 1 : env.isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener('resize', resize);

  // ---------- Mouse tilt (desktop only) ----------
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!env.isTouch && !env.reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  // ---------- Render loop (driven by GSAP's ticker, shared with Lenis + ScrollTrigger) ----------
  let active = true; // false when the tab is hidden or the stage is scrolled off-screen
  let needsRender = true;
  let entrance = 0; // 0 → 1 intro scale-in after the preloader
  const pose = {}; // filled by scroll.js every frame
  const target = new THREE.Vector3();
  const lastState = new Float32Array(16);
  const beforeRender = [];

  document.addEventListener('visibilitychange', () => {
    active = !document.hidden;
  });

  function setActive(v) {
    active = v && !document.hidden;
  }

  function applyPose(time) {
    if (!pose.s) return;
    const float = env.reducedMotion ? 0 : Math.sin(time * 1.3) * 0.06;
    const floatRot = env.reducedMotion ? 0 : Math.sin(time * 0.9) * 0.03;

    // Smooth mouse follow
    mouse.sx += (mouse.x - mouse.sx) * 0.06;
    mouse.sy += (mouse.y - mouse.sy) * 0.06;

    const e = entrance;
    rig.position.set(pose.px, pose.py, pose.pz);
    rig.scale.setScalar(pose.s * (0.6 + 0.4 * e));
    pivot.position.y = float * (1 - pose.explode * 0.5);
    pivot.rotation.set(
      pose.rx + mouse.sy * 0.12 + floatRot,
      pose.ry + mouse.sx * 0.25 - (1 - e) * 1.2,
      pose.rz + floatRot * 0.5
    );

    camera.position.set(pose.cx, pose.cy, pose.cz);
    target.set(pose.tx, pose.ty, pose.tz);
    camera.lookAt(target);

    // Floor sits just under the model's lowest point and scales with it
    const scale = rig.scale.x;
    shadow.group.position.set(rig.position.x, rig.position.y + (product.bottom - 0.02) * scale, rig.position.z);
    shadow.setScale(scale);
    shadow.setOpacity(lite ? 0 : pose.shadow * e);
    product?.setExplode?.(pose.explode);
  }

  /** Cheap "did anything change?" check so a still scene doesn't re-render. */
  function changed() {
    const s = [
      rig.position.x, rig.position.y, rig.scale.x, pivot.position.y,
      pivot.rotation.x, pivot.rotation.y, pivot.rotation.z,
      camera.position.x, camera.position.y, camera.position.z,
      target.x, target.y, target.z, pose.explode || 0, pose.shadow || 0, pose.colorKey || 0,
    ];
    let diff = false;
    for (let i = 0; i < s.length; i++) {
      if (Math.abs(s[i] - lastState[i]) > 1e-5) diff = true;
      lastState[i] = s[i];
    }
    return diff;
  }

  function tick(time) {
    if (!active || !product) return;
    applyPose(time);
    for (const fn of beforeRender) fn();
    if (!changed() && !needsRender) return;
    needsRender = false;
    if (!lite && pose.shadow > 0.01) shadow.render(scene);
    renderer.render(scene, camera);
  }

  /**
   * Precompile shaders without blocking the main thread: in parallel when the GPU driver
   * supports it, otherwise one part per task so no single task freezes the page.
   */
  async function compile() {
    resize();
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(scene, camera);
      return;
    }
    const parts = [];
    product?.object.traverse((o) => o.isMesh && parts.push(o));
    for (const mesh of parts) {
      renderer.compile(mesh, camera, scene);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  /** Project a 3D point to viewport pixels. */
  const v = new THREE.Vector3();
  function project(obj) {
    obj.getWorldPosition(v);
    v.project(camera);
    return { x: (v.x + 1) * 0.5 * size.w, y: (1 - v.y) * 0.5 * size.h, visible: v.z < 1 };
  }

  resize();

  return {
    THREE,
    renderer,
    scene,
    camera,
    rig,
    pivot,
    pose,
    size,
    tick,
    compile,
    setProduct,
    setActive,
    project,
    get product() {
      return product;
    },
    set entrance(v) {
      entrance = v;
    },
    get entrance() {
      return entrance;
    },
    onBeforeRender: (fn) => beforeRender.push(fn),
    invalidate: () => (needsRender = true),
    fovRad: (FOV * Math.PI) / 180,
  };
}
