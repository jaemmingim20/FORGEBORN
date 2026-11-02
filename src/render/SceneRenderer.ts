import * as THREE from 'three';

export class SceneRenderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, 1, 0.06, 350);
  readonly renderer: THREE.WebGLRenderer;
  private readonly sky: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;

  constructor(readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // The Phase 1 world is static; do not redraw its shadow map every frame.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'FORGEBORN 1인칭 3D 월드');
    this.container.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#abb5a7');
    this.scene.fog = new THREE.Fog('#a1aea0', 38, 145);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#365d6e') },
        horizon: { value: new THREE.Color('#e3c79d') },
      },
      vertexShader:
        'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:
        'varying vec3 vPosition; uniform vec3 top; uniform vec3 horizon; void main(){ float h=normalize(vPosition).y; gl_FragColor=vec4(mix(horizon,top,pow(max(h,0.0),0.55)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(280, 24, 12), skyMaterial);
    this.scene.add(this.sky);
    this.scene.add(new THREE.HemisphereLight('#c4e0e6', '#746448', 2.1));
    const sun = new THREE.DirectionalLight('#ffdb9c', 3.1);
    sun.position.set(-25, 42, -16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -43;
    sun.shadow.camera.right = sun.shadow.camera.top = 43;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.045;
    sun.target.position.set(0, 0, -8);
    this.scene.add(sun, sun.target);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  private resize(): void {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
