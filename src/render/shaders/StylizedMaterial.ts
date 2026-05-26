import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function cacheKey(
  color: THREE.ColorRepresentation,
  options?: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    flatShading?: boolean;
  },
  rim = true,
): string {
  return [
    String(color),
    options?.emissive ?? 0,
    options?.emissiveIntensity ?? 0,
    options?.roughness ?? 0.72,
    options?.metalness ?? 0.08,
    options?.flatShading ?? true,
    rim,
  ].join('|');
}

/** Cached low-poly stylized material — avoids shader recompilation spam */
export function createStylizedMaterial(
  color: THREE.ColorRepresentation,
  options?: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    flatShading?: boolean;
  },
  rim = true,
): THREE.MeshStandardMaterial {
  const key = cacheKey(color, options, rim);
  const cached = materialCache.get(key);
  if (cached) return cached;

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
    roughness: options?.roughness ?? 0.72,
    metalness: options?.metalness ?? 0.08,
    flatShading: options?.flatShading ?? true,
  });

  if (rim) {
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        vec3 viewDir = normalize(vViewPosition);
        vec3 normal = normalize(vNormal);
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.8);
        gl_FragColor.rgb += rim * 0.18 * vec3(0.85, 0.9, 1.0);
        `,
      );
    };
  }

  materialCache.set(key, mat);
  return mat;
}

export function createBiomeGroundMaterial(baseColor: number, accent: number): THREE.MeshStandardMaterial {
  const mat = createStylizedMaterial(baseColor, { roughness: 0.85 }, false);
  mat.userData.accent = accent;
  return mat;
}

export function clearMaterialCache(): void {
  materialCache.forEach((m) => m.dispose());
  materialCache.clear();
}
