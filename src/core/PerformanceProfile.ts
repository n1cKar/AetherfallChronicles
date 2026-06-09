import type { GameSettings } from '../save/SaveManager';
import { isMobileDevice } from '../utils/device';

export interface PerformanceProfile {
  pixelRatio: number;
  chunkViewDistance: number;
  terrainSegments: number;
  maxPropsPerChunk: number;
  treeDensityMult: number;
  grassCount: number;
  grassUpdateInterval: number;
  weatherParticles: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  postProcessing: boolean;
  postProcessingScale: number;
  maxChunksPerFrame: number;
  physicsSubSteps: number;
  colliderRadius: number;
  maxEnemies: number;
  useRimShaders: boolean;
  antialias: boolean;
}

export function buildPerformanceProfile(settings: GameSettings): PerformanceProfile {
  const q = settings.graphicsQuality;
  const particleMult = settings.particles === 'high' ? 1 : settings.particles === 'medium' ? 0.65 : 0.35;
  const base: PerformanceProfile = {
    pixelRatio: 1,
    chunkViewDistance: 3,
    terrainSegments: 16,
    maxPropsPerChunk: 10,
    treeDensityMult: 0.78,
    grassCount: 0,
    grassUpdateInterval: 999,
    weatherParticles: Math.floor(400 * particleMult),
    shadowMapSize: 1024,
    shadowsEnabled: settings.shadows,
    postProcessing: settings.bloom && q !== 'low',
    postProcessingScale: 0.75,
    maxChunksPerFrame: 2,
    physicsSubSteps: 1,
    colliderRadius: 14,
    maxEnemies: 22,
    useRimShaders: q !== 'low',
    antialias: q !== 'low',
  };

  if (q === 'medium') {
    return applyMobileCaps({
      ...base,
      pixelRatio: Math.min(window.devicePixelRatio, 1.25),
      grassCount: 120,
      grassUpdateInterval: 0.35,
      maxPropsPerChunk: 8,
      postProcessingScale: 0.65,
    });
  }
  if (q === 'high') {
    return applyMobileCaps({
      ...base,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      chunkViewDistance: 3,
      grassCount: 220,
      grassUpdateInterval: 0.25,
      maxPropsPerChunk: 10,
      physicsSubSteps: 2,
      maxEnemies: 28,
    });
  }
  if (q === 'ultra') {
    return applyMobileCaps({
      ...base,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      chunkViewDistance: 4,
      terrainSegments: 20,
      maxPropsPerChunk: 12,
      treeDensityMult: 0.85,
      grassCount: 350,
      grassUpdateInterval: 0.2,
      weatherParticles: Math.floor(700 * particleMult),
      shadowMapSize: 1536,
      postProcessingScale: 1,
      maxChunksPerFrame: 3,
      physicsSubSteps: 2,
      colliderRadius: 18,
      maxEnemies: 32,
    });
  }
  // low
  return applyMobileCaps({
    ...base,
    pixelRatio: 1,
    chunkViewDistance: 2,
    terrainSegments: 12,
    maxPropsPerChunk: 6,
    treeDensityMult: 0.45,
    weatherParticles: Math.floor(250 * particleMult),
    shadowsEnabled: false,
    postProcessing: false,
    maxChunksPerFrame: 1,
    useRimShaders: false,
    antialias: false,
    maxEnemies: 16,
  });
}

function applyMobileCaps(profile: PerformanceProfile): PerformanceProfile {
  if (!isMobileDevice()) return profile;
  return {
    ...profile,
    pixelRatio: Math.min(profile.pixelRatio, 1.25),
    chunkViewDistance: Math.min(profile.chunkViewDistance, 2),
    terrainSegments: Math.min(profile.terrainSegments, 14),
    maxPropsPerChunk: Math.min(profile.maxPropsPerChunk, 7),
    treeDensityMult: profile.treeDensityMult * 0.75,
    grassCount: Math.min(profile.grassCount, 90),
    grassUpdateInterval: Math.max(profile.grassUpdateInterval, 0.4),
    weatherParticles: Math.min(profile.weatherParticles, 220),
    shadowMapSize: Math.min(profile.shadowMapSize, 768),
    shadowsEnabled: false,
    postProcessing: profile.postProcessing && profile.postProcessingScale > 0.5,
    postProcessingScale: Math.min(profile.postProcessingScale, 0.55),
    maxChunksPerFrame: 1,
    physicsSubSteps: 1,
    colliderRadius: Math.min(profile.colliderRadius, 12),
    maxEnemies: Math.min(profile.maxEnemies, 18),
    antialias: false,
  };
}
