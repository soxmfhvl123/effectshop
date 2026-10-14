import * as THREE from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { halftoneFragmentShader, halftoneVertexShader } from '../effects/shaders/halftone'
import { crtFragmentShader, crtVertexShader } from '../effects/shaders/crt'
import { ditherFragmentShader, ditherVertexShader } from '../effects/shaders/dither'
import { rgbShiftFragmentShader, rgbShiftVertexShader } from '../effects/shaders/rgbShift'
import { asciiFragmentShader, asciiVertexShader } from '../effects/shaders/ascii'
import { filmGrainFragmentShader, filmGrainVertexShader } from '../effects/shaders/filmGrain'
import { getCharAtlas } from '../effects/asciiAtlas'
import { crossHatchFragmentShader, crossHatchVertexShader } from '../effects/shaders/crossHatch'
import { embossFragmentShader, embossVertexShader } from '../effects/shaders/emboss'
import { pixelateFragmentShader, pixelateVertexShader } from '../effects/shaders/pixelate'
import { vhsFragmentShader, vhsVertexShader } from '../effects/shaders/vhs'
import { posterizeFragmentShader, posterizeVertexShader } from '../effects/shaders/posterize'
import { blockGlitchFragmentShader, blockGlitchVertexShader } from '../effects/shaders/blockGlitch'
import { scanDisplaceFragmentShader, scanDisplaceVertexShader } from '../effects/shaders/scanDisplace'
import { tiltShiftFragmentShader, tiltShiftVertexShader } from '../effects/shaders/tiltShift'
import { zoomBlurFragmentShader, zoomBlurVertexShader } from '../effects/shaders/zoomBlur'
import { duotoneFragmentShader, duotoneVertexShader } from '../effects/shaders/duotone'
import { vintageFadeFragmentShader, vintageFadeVertexShader } from '../effects/shaders/vintageFade'
import { noiseGenFragmentShader, noiseGenVertexShader } from '../effects/shaders/noiseGen'
import { inkBleedFragmentShader, inkBleedVertexShader } from '../effects/shaders/inkBleed'
import { paperScanFragmentShader, paperScanVertexShader } from '../effects/shaders/paperScan'
import { paperCutoutFragmentShader, paperCutoutVertexShader } from '../effects/shaders/paperCutout'
import { overlayBlendFragmentShader, overlayBlendVertexShader } from '../effects/shaders/overlayBlend'
import { getOverlayCanvas } from '../effects/overlayCanvas'
import { drawTextOverlay } from '../effects/textOverlay'
import { pointCloudFragmentShader, pointCloudVertexShader } from '../effects/shaders/pointCloud'
import { flowFieldFragmentShader, flowFieldVertexShader } from '../effects/shaders/flowField'
import { voronoiCellsFragmentShader, voronoiCellsVertexShader } from '../effects/shaders/voronoiCells'
import { motionBlurFragmentShader, motionBlurVertexShader } from '../effects/shaders/motionBlur'
import { radialBlurFragmentShader, radialBlurVertexShader } from '../effects/shaders/radialBlur'
import { monochromeFragmentShader, monochromeVertexShader } from '../effects/shaders/monochrome'
import { levelsFragmentShader, levelsVertexShader } from '../effects/shaders/levels'
import { thresholdFragmentShader, thresholdVertexShader } from '../effects/shaders/threshold'
import { ntscFragmentShader, ntscVertexShader } from '../effects/shaders/ntsc'
import { ledScreenFragmentShader, ledScreenVertexShader } from '../effects/shaders/ledScreen'
import { rippleFragmentShader, rippleVertexShader } from '../effects/shaders/ripple'
import { swirlFragmentShader, swirlVertexShader } from '../effects/shaders/swirl'
import { pinchBulgeFragmentShader, pinchBulgeVertexShader } from '../effects/shaders/pinchBulge'

const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : Number(v) || fallback)

function hexToRgb(hex: unknown, fallback: THREE.Color): THREE.Color {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) return new THREE.Color(hex)
  return fallback
}

// `type` picks a Bayer matrix size + quantization level count together (see
// the comment at the top of effects/shaders/dither.ts for why these four
// names map to matrix/levels pairs rather than distinct algorithms).
const DITHER_TYPE_MAP: Record<string, { matrixMode: number; levels: number }> = {
  '1bit': { matrixMode: 0, levels: 2 },
  '2bit': { matrixMode: 0, levels: 4 },
  bayer4: { matrixMode: 0, levels: 8 },
  bayer8: { matrixMode: 1, levels: 16 },
}

const PALETTE_MAP: Record<string, number> = { monochrome: 0, gameboy: 1, cyberpunk: 2 }

// Maps effectId -> factory that builds a fresh ShaderPass with default uniforms.
const PASS_FACTORY: Record<string, () => ShaderPass> = {
  halftone: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uScale: { value: 8 },
        uAngle: { value: 15 },
        uContrast: { value: 1 },
        uBlendMode: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: halftoneVertexShader,
      fragmentShader: halftoneFragmentShader,
    }),
  crt: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCurvature: { value: 0.15 },
        uScanlineCount: { value: 240 },
        uScanlineIntensity: { value: 0.35 },
        uVignette: { value: 0.4 },
        uOpacity: { value: 1 },
      },
      vertexShader: crtVertexShader,
      fragmentShader: crtFragmentShader,
    }),
  dither: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelScale: { value: 2 },
        uMatrixMode: { value: 0 },
        uLevels: { value: 8 },
        uPalette: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: ditherVertexShader,
      fragmentShader: ditherFragmentShader,
    }),
  rgbShift: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 4 },
        uAngle: { value: 0 },
        uRadial: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: rgbShiftVertexShader,
      fragmentShader: rgbShiftFragmentShader,
    }),
  ascii: () => {
    const atlas = getCharAtlas('standard')
    return new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tCharAtlas: { value: atlas.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCharSize: { value: 10 },
        uCharCount: { value: atlas.charCount },
        uInvert: { value: 0 },
        uColorMode: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: asciiVertexShader,
      fragmentShader: asciiFragmentShader,
    })
  },
  filmGrain: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uGrainSize: { value: 1 },
        uGrainIntensity: { value: 0.3 },
        uHalationRadius: { value: 8 },
        uHalationTint: { value: new THREE.Color('#ff6a3d') },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: filmGrainVertexShader,
      fragmentShader: filmGrainFragmentShader,
    }),
  crossHatch: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSpacing: { value: 10 },
        uThickness: { value: 0.15 },
        uInvert: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: crossHatchVertexShader,
      fragmentShader: crossHatchFragmentShader,
    }),
  emboss: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uStrength: { value: 3 },
        uAngle: { value: 45 },
        uColorAmount: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: embossVertexShader,
      fragmentShader: embossFragmentShader,
    }),
  pixelate: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uBlockSize: { value: 12 },
        uOpacity: { value: 1 },
      },
      vertexShader: pixelateVertexShader,
      fragmentShader: pixelateFragmentShader,
    }),
  vhs: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uJitter: { value: 4 },
        uNoise: { value: 0.15 },
        uSpeed: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: vhsVertexShader,
      fragmentShader: vhsFragmentShader,
    }),
  posterize: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uLevels: { value: 4 },
        uOpacity: { value: 1 },
      },
      vertexShader: posterizeVertexShader,
      fragmentShader: posterizeFragmentShader,
    }),
  blockGlitch: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uBlockSize: { value: 16 },
        uSpeed: { value: 4 },
        uOpacity: { value: 1 },
      },
      vertexShader: blockGlitchVertexShader,
      fragmentShader: blockGlitchFragmentShader,
    }),
  scanDisplace: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uAmplitude: { value: 6 },
        uFrequency: { value: 8 },
        uSpeed: { value: 2 },
        uOpacity: { value: 1 },
      },
      vertexShader: scanDisplaceVertexShader,
      fragmentShader: scanDisplaceFragmentShader,
    }),
  tiltShift: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFocusPosition: { value: 0.5 },
        uFocusWidth: { value: 0.25 },
        uBlurAmount: { value: 8 },
        uOpacity: { value: 1 },
      },
      vertexShader: tiltShiftVertexShader,
      fragmentShader: tiltShiftFragmentShader,
    }),
  zoomBlur: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 0.4 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: zoomBlurVertexShader,
      fragmentShader: zoomBlurFragmentShader,
    }),
  duotone: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uShadowColor: { value: new THREE.Color('#050a30') },
        uHighlightColor: { value: new THREE.Color('#ff8a00') },
        uContrast: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: duotoneVertexShader,
      fragmentShader: duotoneFragmentShader,
    }),
  vintageFade: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFade: { value: 0.35 },
        uWarmth: { value: 0.4 },
        uSaturation: { value: 0.85 },
        uVignette: { value: 0.3 },
        uOpacity: { value: 1 },
      },
      vertexShader: vintageFadeVertexShader,
      fragmentShader: vintageFadeFragmentShader,
    }),
  noiseGen: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uIntensity: { value: 0.4 },
        uScale: { value: 2 },
        uMonochrome: { value: 1 },
        uSpeed: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: noiseGenVertexShader,
      fragmentShader: noiseGenFragmentShader,
    }),
  inkBleed: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 6 },
        uScale: { value: 10 },
        uEdgeThreshold: { value: 0.15 },
        uInkColor: { value: new THREE.Color('#050505') },
        uOpacity: { value: 1 },
      },
      vertexShader: inkBleedVertexShader,
      fragmentShader: inkBleedFragmentShader,
    }),
  paperScan: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uContrast: { value: 0.5 },
        uStreaks: { value: 0.2 },
        uDust: { value: 0.3 },
        uWarp: { value: 0.15 },
        uOpacity: { value: 1 },
      },
      vertexShader: paperScanVertexShader,
      fragmentShader: paperScanFragmentShader,
    }),
  paperCutout: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uLevels: { value: 5 },
        uOffset: { value: 6 },
        uShadowColor: { value: new THREE.Color('#ff4d8f') },
        uOpacity: { value: 1 },
      },
      vertexShader: paperCutoutVertexShader,
      fragmentShader: paperCutoutFragmentShader,
    }),
  text: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tOverlay: { value: new THREE.Texture() },
        uOpacity: { value: 1 },
      },
      vertexShader: overlayBlendVertexShader,
      fragmentShader: overlayBlendFragmentShader,
    }),
  // Blob Tracker's overlay (boxes/labels/lines) is driven by
  // updateBlobTrackerOverlay (blobTrackerOverlay.ts) from EffectRenderer,
  // which has access to the source media; this factory just wires up the
  // same generic alpha-blend shader its overlay texture gets composited with.
  blobTracker: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tOverlay: { value: new THREE.Texture() },
        uOpacity: { value: 1 },
      },
      vertexShader: overlayBlendVertexShader,
      fragmentShader: overlayBlendFragmentShader,
    }),
  pointCloud: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uKeyColor: { value: new THREE.Color('#000000') },
        uThreshold: { value: 0.3 },
        uSpacing: { value: 14 },
        uDotSize: { value: 5 },
        uJitter: { value: 0.4 },
        uUseSourceColor: { value: 1 },
        uDotColor: { value: new THREE.Color('#00ffc8') },
        uOpacity: { value: 1 },
      },
      vertexShader: pointCloudVertexShader,
      fragmentShader: pointCloudFragmentShader,
    }),
  flowField: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpacing: { value: 16 },
        uLineLength: { value: 10 },
        uThickness: { value: 1.2 },
        uNoiseScale: { value: 0.08 },
        uSpeed: { value: 0.5 },
        uLuminanceReactive: { value: 1 },
        uLineColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 1 },
      },
      vertexShader: flowFieldVertexShader,
      fragmentShader: flowFieldFragmentShader,
    }),
  voronoiCells: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uScale: { value: 40 },
        uEdgeThickness: { value: 1.5 },
        uEdgeColor: { value: new THREE.Color('#0a0a0a') },
        uFillAmount: { value: 0.6 },
        uSpeed: { value: 0.3 },
        uOpacity: { value: 1 },
      },
      vertexShader: voronoiCellsVertexShader,
      fragmentShader: voronoiCellsFragmentShader,
    }),
  motionBlur: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 15 },
        uAngle: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: motionBlurVertexShader,
      fragmentShader: motionBlurFragmentShader,
    }),
  radialBlur: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 8 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: radialBlurVertexShader,
      fragmentShader: radialBlurFragmentShader,
    }),
  monochrome: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTint: { value: new THREE.Color('#ffffff') },
        uContrast: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: monochromeVertexShader,
      fragmentShader: monochromeFragmentShader,
    }),
  levels: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uBlackPoint: { value: 0 },
        uWhitePoint: { value: 1 },
        uGamma: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: levelsVertexShader,
      fragmentShader: levelsFragmentShader,
    }),
  threshold: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uLevel: { value: 0.5 },
        uSoftness: { value: 0.02 },
        uDarkColor: { value: new THREE.Color('#000000') },
        uLightColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 1 },
      },
      vertexShader: thresholdVertexShader,
      fragmentShader: thresholdFragmentShader,
    }),
  ntsc: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uBleed: { value: 3 },
        uColorShift: { value: 2 },
        uNoise: { value: 0.08 },
        uOpacity: { value: 1 },
      },
      vertexShader: ntscVertexShader,
      fragmentShader: ntscFragmentShader,
    }),
  ledScreen: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCellSize: { value: 9 },
        uGridDarkness: { value: 0.6 },
        uOpacity: { value: 1 },
      },
      vertexShader: ledScreenVertexShader,
      fragmentShader: ledScreenFragmentShader,
    }),
  ripple: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uAmplitude: { value: 10 },
        uFrequency: { value: 8 },
        uSpeed: { value: 2 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
    }),
  swirl: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAngle: { value: 120 },
        uRadius: { value: 150 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: swirlVertexShader,
      fragmentShader: swirlFragmentShader,
    }),
  pinchBulge: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 0.6 },
        uRadius: { value: 150 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: pinchBulgeVertexShader,
      fragmentShader: pinchBulgeFragmentShader,
    }),
}

export function isEffectRenderable(effectId: string): boolean {
  return effectId in PASS_FACTORY
}

export function createPass(effect: AppliedEffect): ShaderPass | null {
  const factory = PASS_FACTORY[effect.effectId]
  if (!factory) return null
  const pass = factory()
  updatePassUniforms(pass, effect, new THREE.Vector2(1, 1))
  return pass
}

// Pushes an AppliedEffect's current parameters/opacity into an existing
// pass's uniforms in place, so parameter drags don't require rebuilding the
// composer's pass chain.
export function updatePassUniforms(pass: ShaderPass, effect: AppliedEffect, resolution: THREE.Vector2) {
  const u = pass.uniforms
  if (!u) return
  if (u.uResolution) u.uResolution.value.copy(resolution)
  if (u.uOpacity) u.uOpacity.value = effect.opacity

  switch (effect.effectId) {
    case 'halftone':
      u.uScale.value = num(effect.parameters.scale, 8)
      u.uAngle.value = num(effect.parameters.angle, 15)
      u.uContrast.value = num(effect.parameters.contrast, 1)
      u.uBlendMode.value = effect.parameters.blendMode === 'multiply' ? 1 : 0
      break
    case 'crt':
      u.uCurvature.value = num(effect.parameters.curvature, 0.15)
      u.uScanlineCount.value = num(effect.parameters.scanlineCount, 240)
      u.uScanlineIntensity.value = num(effect.parameters.scanlineIntensity, 0.35)
      u.uVignette.value = num(effect.parameters.vignette, 0.4)
      break
    case 'dither': {
      const mapping = DITHER_TYPE_MAP[String(effect.parameters.type)] ?? DITHER_TYPE_MAP.bayer4
      u.uPixelScale.value = num(effect.parameters.scale, 2)
      u.uMatrixMode.value = mapping.matrixMode
      u.uLevels.value = mapping.levels
      u.uPalette.value = PALETTE_MAP[String(effect.parameters.palette)] ?? 0
      break
    }
    case 'rgbShift':
      u.uAmount.value = num(effect.parameters.amount, 4)
      u.uAngle.value = num(effect.parameters.angle, 0)
      u.uRadial.value = effect.parameters.radialDistortion ? 1 : 0
      break
    case 'ascii': {
      const atlas = getCharAtlas(String(effect.parameters.charSet ?? 'standard'))
      u.tCharAtlas.value = atlas.texture
      u.uCharCount.value = atlas.charCount
      u.uCharSize.value = num(effect.parameters.charSize, 10)
      u.uInvert.value = effect.parameters.invert ? 1 : 0
      u.uColorMode.value = effect.parameters.colorMode === 'original' ? 1 : 0
      break
    }
    case 'filmGrain':
      u.uGrainSize.value = num(effect.parameters.grainSize, 1)
      u.uGrainIntensity.value = num(effect.parameters.grainIntensity, 0.3)
      u.uHalationRadius.value = num(effect.parameters.halationRadius, 8)
      u.uHalationTint.value = hexToRgb(effect.parameters.halationTint, u.uHalationTint.value)
      break
    case 'crossHatch':
      u.uSpacing.value = num(effect.parameters.spacing, 10)
      u.uThickness.value = num(effect.parameters.thickness, 0.15)
      u.uInvert.value = effect.parameters.invert ? 1 : 0
      break
    case 'emboss':
      u.uStrength.value = num(effect.parameters.strength, 3)
      u.uAngle.value = num(effect.parameters.angle, 45)
      u.uColorAmount.value = effect.parameters.colored ? 1 : 0
      break
    case 'pixelate':
      u.uBlockSize.value = num(effect.parameters.blockSize, 12)
      break
    case 'vhs':
      u.uJitter.value = num(effect.parameters.jitter, 4)
      u.uNoise.value = num(effect.parameters.noise, 0.15)
      u.uSpeed.value = num(effect.parameters.speed, 0.5)
      break
    case 'posterize':
      u.uLevels.value = num(effect.parameters.levels, 4)
      break
    case 'blockGlitch':
      u.uIntensity.value = num(effect.parameters.intensity, 0.3)
      u.uBlockSize.value = num(effect.parameters.blockSize, 16)
      u.uSpeed.value = num(effect.parameters.speed, 4)
      break
    case 'scanDisplace':
      u.uAmplitude.value = num(effect.parameters.amplitude, 6)
      u.uFrequency.value = num(effect.parameters.frequency, 8)
      u.uSpeed.value = num(effect.parameters.speed, 2)
      break
    case 'tiltShift':
      u.uFocusPosition.value = num(effect.parameters.focusPosition, 0.5)
      u.uFocusWidth.value = num(effect.parameters.focusWidth, 0.25)
      u.uBlurAmount.value = num(effect.parameters.blurAmount, 8)
      break
    case 'zoomBlur':
      u.uAmount.value = num(effect.parameters.amount, 0.4)
      u.uCenterX.value = num(effect.parameters.centerX, 0.5)
      u.uCenterY.value = num(effect.parameters.centerY, 0.5)
      break
    case 'duotone':
      u.uShadowColor.value = hexToRgb(effect.parameters.shadowColor, u.uShadowColor.value)
      u.uHighlightColor.value = hexToRgb(effect.parameters.highlightColor, u.uHighlightColor.value)
      u.uContrast.value = num(effect.parameters.contrast, 1)
      break
    case 'vintageFade':
      u.uFade.value = num(effect.parameters.fade, 0.35)
      u.uWarmth.value = num(effect.parameters.warmth, 0.4)
      u.uSaturation.value = num(effect.parameters.saturation, 0.85)
      u.uVignette.value = num(effect.parameters.vignette, 0.3)
      break
    case 'noiseGen':
      u.uIntensity.value = num(effect.parameters.intensity, 0.4)
      u.uScale.value = num(effect.parameters.scale, 2)
      u.uMonochrome.value = effect.parameters.monochrome === false ? 0 : 1
      u.uSpeed.value = num(effect.parameters.speed, 1)
      break
    case 'inkBleed':
      u.uAmount.value = num(effect.parameters.amount, 6)
      u.uScale.value = num(effect.parameters.scale, 10)
      u.uEdgeThreshold.value = num(effect.parameters.edgeThreshold, 0.15)
      u.uInkColor.value = hexToRgb(effect.parameters.inkColor, u.uInkColor.value)
      break
    case 'paperScan':
      u.uContrast.value = num(effect.parameters.contrast, 0.5)
      u.uStreaks.value = num(effect.parameters.streaks, 0.2)
      u.uDust.value = num(effect.parameters.dust, 0.3)
      u.uWarp.value = num(effect.parameters.warp, 0.15)
      break
    case 'paperCutout':
      u.uLevels.value = num(effect.parameters.levels, 5)
      u.uOffset.value = num(effect.parameters.offset, 6)
      u.uShadowColor.value = hexToRgb(effect.parameters.shadowColor, u.uShadowColor.value)
      break
    case 'text': {
      const { ctx, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
      drawTextOverlay(ctx, {
        text: typeof effect.parameters.text === 'string' ? effect.parameters.text : 'TEXT',
        size: num(effect.parameters.size, 48),
        color: typeof effect.parameters.color === 'string' ? effect.parameters.color : '#ffffff',
        angle: num(effect.parameters.angle, 0),
        tile: effect.parameters.tile !== false,
      })
      texture.needsUpdate = true
      u.tOverlay.value = texture
      break
    }
    // 'blobTracker' has no static uniforms to push here — its tOverlay is
    // populated by updateBlobTrackerOverlay, called from EffectRenderer
    // where the source media is available.
    case 'pointCloud':
      u.uKeyColor.value = hexToRgb(effect.parameters.keyColor, u.uKeyColor.value)
      u.uThreshold.value = num(effect.parameters.threshold, 0.3)
      u.uSpacing.value = num(effect.parameters.spacing, 14)
      u.uDotSize.value = num(effect.parameters.dotSize, 5)
      u.uJitter.value = num(effect.parameters.jitter, 0.4)
      u.uUseSourceColor.value = effect.parameters.useSourceColor === false ? 0 : 1
      u.uDotColor.value = hexToRgb(effect.parameters.dotColor, u.uDotColor.value)
      break
    case 'flowField':
      u.uSpacing.value = num(effect.parameters.spacing, 16)
      u.uLineLength.value = num(effect.parameters.lineLength, 10)
      u.uThickness.value = num(effect.parameters.thickness, 1.2)
      u.uNoiseScale.value = num(effect.parameters.noiseScale, 0.08)
      u.uSpeed.value = num(effect.parameters.speed, 0.5)
      u.uLuminanceReactive.value = effect.parameters.luminanceReactive === false ? 0 : 1
      u.uLineColor.value = hexToRgb(effect.parameters.lineColor, u.uLineColor.value)
      break
    case 'voronoiCells':
      u.uScale.value = num(effect.parameters.scale, 40)
      u.uEdgeThickness.value = num(effect.parameters.edgeThickness, 1.5)
      u.uEdgeColor.value = hexToRgb(effect.parameters.edgeColor, u.uEdgeColor.value)
      u.uFillAmount.value = num(effect.parameters.fillAmount, 0.6)
      u.uSpeed.value = num(effect.parameters.speed, 0.3)
      break
    case 'motionBlur':
      u.uAmount.value = num(effect.parameters.amount, 15)
      u.uAngle.value = num(effect.parameters.angle, 0)
      break
    case 'radialBlur':
      u.uAmount.value = num(effect.parameters.amount, 8)
      u.uCenterX.value = num(effect.parameters.centerX, 0.5)
      u.uCenterY.value = num(effect.parameters.centerY, 0.5)
      break
    case 'monochrome':
      u.uTint.value = hexToRgb(effect.parameters.tint, u.uTint.value)
      u.uContrast.value = num(effect.parameters.contrast, 1)
      break
    case 'levels':
      u.uBlackPoint.value = num(effect.parameters.blackPoint, 0)
      u.uWhitePoint.value = num(effect.parameters.whitePoint, 1)
      u.uGamma.value = num(effect.parameters.gamma, 1)
      break
    case 'threshold':
      u.uLevel.value = num(effect.parameters.level, 0.5)
      u.uSoftness.value = num(effect.parameters.softness, 0.02)
      u.uDarkColor.value = hexToRgb(effect.parameters.darkColor, u.uDarkColor.value)
      u.uLightColor.value = hexToRgb(effect.parameters.lightColor, u.uLightColor.value)
      break
    case 'ntsc':
      u.uBleed.value = num(effect.parameters.bleed, 3)
      u.uColorShift.value = num(effect.parameters.colorShift, 2)
      u.uNoise.value = num(effect.parameters.noise, 0.08)
      break
    case 'ledScreen':
      u.uCellSize.value = num(effect.parameters.cellSize, 9)
      u.uGridDarkness.value = num(effect.parameters.gridDarkness, 0.6)
      break
    case 'ripple':
      u.uAmplitude.value = num(effect.parameters.amplitude, 10)
      u.uFrequency.value = num(effect.parameters.frequency, 8)
      u.uSpeed.value = num(effect.parameters.speed, 2)
      u.uCenterX.value = num(effect.parameters.centerX, 0.5)
      u.uCenterY.value = num(effect.parameters.centerY, 0.5)
      break
    case 'swirl':
      u.uAngle.value = num(effect.parameters.angle, 120)
      u.uRadius.value = num(effect.parameters.radius, 150)
      u.uCenterX.value = num(effect.parameters.centerX, 0.5)
      u.uCenterY.value = num(effect.parameters.centerY, 0.5)
      break
    case 'pinchBulge':
      u.uAmount.value = num(effect.parameters.amount, 0.6)
      u.uRadius.value = num(effect.parameters.radius, 150)
      u.uCenterX.value = num(effect.parameters.centerX, 0.5)
      u.uCenterY.value = num(effect.parameters.centerY, 0.5)
      break
  }
}

// Called once per rendered frame (not just on parameter change) so
// time-varying effects like film grain animate instead of looking frozen.
export function tickPassTime(pass: ShaderPass, elapsedSeconds: number) {
  const u = pass.uniforms
  if (u?.uTime) u.uTime.value = elapsedSeconds
}
