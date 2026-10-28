/**
 * Soft contact shadow (technique from the three.js "contact shadows" example):
 * render the product's depth from below into a small texture, blur it twice,
 * and show it on a transparent plane under the product.
 *
 * Note: three.js cameras ignore their parents' scale, so this group must NOT live
 * under a scaled object. Use setScale() to grow/shrink the shadow with the product.
 */
import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

export function createContactShadow(renderer, { size = 6, resolution = 512, blur = 3, opacity = 0.55, height = 2.2, darkness = 1.4 } = {}) {
  const group = new THREE.Group();

  const rt = new THREE.WebGLRenderTarget(resolution, resolution);
  const rtBlur = new THREE.WebGLRenderTarget(resolution, resolution);
  rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;

  const planeGeo = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
  const planeMat = new THREE.MeshBasicMaterial({
    map: rt.texture,
    opacity,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.renderOrder = 1;
  plane.scale.y = -1; // the shadow camera looks up, so flip the texture
  group.add(plane);

  const blurPlane = new THREE.Mesh(planeGeo);
  blurPlane.visible = false;
  group.add(blurPlane);

  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, height);
  cam.rotation.x = Math.PI / 2;
  group.add(cam);

  // Depth material that outputs black with alpha based on distance to the floor
  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.userData.darkness = { value: darkness };
  depthMat.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = depthMat.userData.darkness;
    shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
    )}`;
  };
  depthMat.depthTest = false;
  depthMat.depthWrite = false;

  const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;

  function blurPass(amount) {
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hBlur.uniforms.tDiffuse.value = rt.texture;
    hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtBlur);
    renderer.render(blurPlane, cam);

    blurPlane.material = vBlur;
    vBlur.uniforms.tDiffuse.value = rtBlur.texture;
    vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(rt);
    renderer.render(blurPlane, cam);
    blurPlane.visible = false;
  }

  function render(scene) {
    const prevAlpha = renderer.getClearAlpha();
    const prevBg = scene.background;
    scene.background = null;
    plane.visible = false;
    scene.overrideMaterial = depthMat;
    renderer.setClearAlpha(0);

    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);
    scene.overrideMaterial = null;

    blurPass(blur);
    blurPass(blur * 0.4);

    renderer.setRenderTarget(null);
    renderer.setClearAlpha(prevAlpha);
    scene.background = prevBg;
    plane.visible = planeMat.opacity > 0.001;
  }

  let currentScale = 1;
  /** Resize the shadow area (camera frustum + planes) to match the product's scale. */
  function setScale(k) {
    if (Math.abs(k - currentScale) < 1e-4) return;
    currentScale = k;
    cam.left = cam.bottom = (-size / 2) * k;
    cam.right = cam.top = (size / 2) * k;
    cam.far = height * k;
    cam.updateProjectionMatrix();
    plane.scale.set(k, -1, k);
    blurPlane.scale.set(k, 1, k);
  }

  return {
    group,
    render,
    setScale,
    setOpacity: (o) => {
      planeMat.opacity = opacity * THREE.MathUtils.clamp(o, 0, 1);
      plane.visible = planeMat.opacity > 0.001;
    },
  };
}
