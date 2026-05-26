import * as THREE from 'three';
import type { GameSettings } from '../save/SaveManager';

/**
 * Lightweight post-processing stack: bloom approximation + vignette + color grade.
 * Uses render targets for scalability settings.
 */
export class PostProcessing {
  private composerScene: THREE.Scene;
  private composerCamera: THREE.OrthographicCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private enabled = true;

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    scale = 1,
  ) {
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.composerScene = new THREE.Scene();
    this.composerCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        resolution: { value: new THREE.Vector2(w, h) },
        bloomStrength: { value: 0.45 },
        vignette: { value: 0.2 },
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x1a2035) },
        fogStrength: { value: 0.08 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float bloomStrength;
        uniform float vignette;
        uniform float time;
        uniform vec3 fogColor;
        uniform float fogStrength;
        varying vec2 vUv;

        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          vec2 texel = 1.0 / resolution;
          vec3 bloom = vec3(0.0);
          bloom += texture2D(tDiffuse, vUv + texel * vec2(1.0, 0.0)).rgb;
          bloom += texture2D(tDiffuse, vUv + texel * vec2(-1.0, 0.0)).rgb;
          bloom += texture2D(tDiffuse, vUv + texel * vec2(0.0, 1.0)).rgb;
          bloom += texture2D(tDiffuse, vUv + texel * vec2(0.0, -1.0)).rgb;
          bloom *= 0.25;
          float bright = max(max(bloom.r, bloom.g), bloom.b);
          col.rgb += bloom * bloomStrength * smoothstep(0.55, 1.0, bright);

          vec2 uv = vUv * 2.0 - 1.0;
          float vig = 1.0 - dot(uv, uv) * vignette;
          col.rgb *= vig;

          col.rgb = mix(col.rgb, col.rgb * vec3(1.05, 1.0, 0.92), 0.12);
          col.rgb = pow(col.rgb, vec3(0.95));
          col.rgb = mix(col.rgb, fogColor, fogStrength * (1.0 - vig));

          gl_FragColor = col;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.composerScene.add(this.quad);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width * this.renderScale));
    const h = Math.max(1, Math.floor(height * this.renderScale));
    this.renderTarget.setSize(w, h);
    const mat = this.quad.material as THREE.ShaderMaterial;
    mat.uniforms.resolution.value.set(w, h);
  }

  applySettings(settings: GameSettings, scale = 1): void {
    const mat = this.quad.material as THREE.ShaderMaterial;
    mat.uniforms.bloomStrength.value = settings.bloom ? 0.28 : 0.04;
    this.enabled = settings.graphicsQuality !== 'low' && settings.bloom;
    this.renderScale = scale;
  }

  private renderScale = 1;

  render(scene: THREE.Scene, camera: THREE.Camera, time: number): void {
    if (!this.enabled) {
      this.renderer.render(scene, camera);
      return;
    }

    const mat = this.quad.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = time;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.composerScene, this.composerCamera);
  }

  setFogColor(color: THREE.Color, strength: number): void {
    const mat = this.quad.material as THREE.ShaderMaterial;
    mat.uniforms.fogColor.value.copy(color);
    mat.uniforms.fogStrength.value = strength;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.quad.geometry.dispose();
    (this.quad.material as THREE.Material).dispose();
  }
}
