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
        vignette: { value: 0.03 },
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x1a2035) },
        fogStrength: { value: 0.035 },
        gradeTint: { value: new THREE.Vector3(1, 1, 1) },
        gradeSat: { value: 1.0 },
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
        uniform vec3 gradeTint;
        uniform float gradeSat;
        varying vec2 vUv;

        float filmGrain(vec2 uv, float t) {
          return fract(sin(dot(uv * resolution + t, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        }

        void main() {
          vec2 uv = vUv;
          vec2 texel = 1.0 / resolution;
          float ca = 0.0012;
          vec4 col;
          col.r = texture2D(tDiffuse, uv + texel * vec2(ca, 0.0)).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - texel * vec2(ca, 0.0)).b;
          col.a = 1.0;

          vec3 bloom = vec3(0.0);
          for (float i = -2.0; i <= 2.0; i += 1.0) {
            for (float j = -2.0; j <= 2.0; j += 1.0) {
              bloom += texture2D(tDiffuse, uv + texel * vec2(i, j) * 1.5).rgb;
            }
          }
          bloom *= 0.04;
          float lum = dot(bloom, vec3(0.299, 0.587, 0.114));
          col.rgb += bloom * bloomStrength * smoothstep(0.45, 1.0, lum);

          vec2 vigUv = uv * 2.0 - 1.0;
          float vig = 1.0 - dot(vigUv, vigUv) * vignette;
          col.rgb *= max(vig, 0.94);

          col.rgb = col.rgb / (col.rgb + vec3(1.0));
          col.rgb = pow(col.rgb, vec3(0.92));
          col.rgb = mix(col.rgb, col.rgb * vec3(1.08, 1.02, 0.94), 0.18);
          float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
          col.rgb = mix(vec3(gray), col.rgb, gradeSat);
          col.rgb *= gradeTint;
          col.rgb = max(col.rgb * 1.72 + vec3(0.16), vec3(0.14));
          col.rgb = mix(col.rgb, fogColor, fogStrength * (1.0 - vig));
          col.rgb += filmGrain(uv, time) * 0.012;

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
    mat.uniforms.bloomStrength.value = settings.bloom ? 0.38 : 0.06;
    mat.uniforms.vignette.value = settings.graphicsQuality === 'ultra' ? 0.04 : 0.03;
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

  setBiomeGrade(groundColor: number, fogColor: number): void {
    const mat = this.quad.material as THREE.ShaderMaterial;
    const c = new THREE.Color(groundColor);
    mat.uniforms.gradeTint.value.set(
      1.0 + c.r * 0.22,
      1.0 + c.g * 0.22,
      1.0 + c.b * 0.25,
    );
    const f = new THREE.Color(fogColor);
    const sat = 1.02 + (f.r + f.g + f.b) / 3 * 0.1;
    mat.uniforms.gradeSat.value = Math.min(1.18, sat);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.quad.geometry.dispose();
    (this.quad.material as THREE.Material).dispose();
  }
}
