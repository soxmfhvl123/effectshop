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
import { objectGlowFragmentShader, objectGlowVertexShader } from '../effects/shaders/objectGlow'
import { colorIsolationFragmentShader, colorIsolationVertexShader } from '../effects/shaders/colorIsolation'
import { magneticFieldFragmentShader, magneticFieldVertexShader } from '../effects/shaders/magneticField'
import { liquidMetalFragmentShader, liquidMetalVertexShader, MAX_METABALLS } from '../effects/shaders/liquidMetal'
import { phosphorFragmentShader, phosphorVertexShader } from '../effects/shaders/phosphor'
import { receiptTicketFragmentShader, receiptTicketVertexShader } from '../effects/shaders/receiptTicket'
import { flashLightFragmentShader, flashLightVertexShader } from '../effects/shaders/flashLight'
import { datamoshFragmentShader, datamoshVertexShader } from '../effects/shaders/datamosh'
import { getEffectDefinition } from '../effects/registry'
import { OVERLAY_UPDATERS } from '../effects/overlayRegistry'

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

const PALETTE_MAP: Record<string, number> = { monochrome: 0, gameboy: 1, cyberpunk: 2, custom: 3 }

const PHOSPHOR_COLOR_MAP: Record<string, string> = {
  Pink: '#FF4FD8',
  Green: '#33FF66',
  Amber: '#FFB000',
  White: '#E8F0FF',
}

const DATAMOSH_DIRECTION_MAP: Record<string, number> = { Motion: 0, Horizontal: 1, Vertical: 2, Random: 3 }

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
        uInkColor: { value: new THREE.Color('#111111') },
        uPaperColor: { value: new THREE.Color('#F2F0E8') },
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
  objectGlow: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uKeyColor: { value: new THREE.Color('#000000') },
        uThreshold: { value: 0.3 },
        uGlowWidth: { value: 14 },
        uGlowIntensity: { value: 1.4 },
        uGlowColor: { value: new THREE.Color('#00ffc8') },
        uOpacity: { value: 1 },
      },
      vertexShader: objectGlowVertexShader,
      fragmentShader: objectGlowFragmentShader,
    }),
  colorIsolation: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uKeyColor: { value: new THREE.Color('#000000') },
        uThreshold: { value: 0.3 },
        uTintMode: { value: 0 },
        uTintColor: { value: new THREE.Color('#ff2d7a') },
        uTintStrength: { value: 0.7 },
        uBackgroundSaturation: { value: 0 },
        uBackgroundBrightness: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: colorIsolationVertexShader,
      fragmentShader: colorIsolationFragmentShader,
    }),
  // Motion Glow's trail particles are driven by updateMotionGlowOverlay
  // (motionGlowOverlay.ts) from EffectRenderer, same overlay-blend pattern
  // as Blob Tracker — no static uniforms pushed here.
  motionGlow: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tOverlay: { value: new THREE.Texture() },
        uOpacity: { value: 1 },
      },
      vertexShader: overlayBlendVertexShader,
      fragmentShader: overlayBlendFragmentShader,
    }),
  // Object Warp reuses the swirl shader, but uCenterX/uCenterY are driven
  // externally by updateObjectWarpTracking (objectWarpTracking.ts) from
  // EffectRenderer, which follows the primary detected blob's position.
  objectWarp: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAngle: { value: 150 },
        uRadius: { value: 160 },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uOpacity: { value: 1 },
      },
      vertexShader: swirlVertexShader,
      fragmentShader: swirlFragmentShader,
    }),
  magneticField: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uKeyColor: { value: new THREE.Color('#000000') },
        uThreshold: { value: 0.3 },
        uSpacing: { value: 14 },
        uLineLength: { value: 11 },
        uThickness: { value: 1.4 },
        uFalloff: { value: 60 },
        uFlowSpeed: { value: 0.6 },
        uFieldColor: { value: new THREE.Color('#9be8ff') },
        uOpacity: { value: 1 },
      },
      vertexShader: magneticFieldVertexShader,
      fragmentShader: magneticFieldFragmentShader,
    }),
  // Liquid Metal's uBalls array is pushed by updateMetaballTracking
  // (metaballTracking.ts) from EffectRenderer -- not touched here beyond
  // the zeroed default (all radius 0 = no contribution, nothing merges
  // until real blobs are detected).
  liquidMetal: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uBalls: { value: Array.from({ length: MAX_METABALLS }, () => new THREE.Vector3(0, 0, 0)) },
        uMergeThreshold: { value: 1 },
        uRefraction: { value: 18 },
        uRimIntensity: { value: 0.5 },
        uLiquidColor: { value: new THREE.Color('#7fd8ff') },
        uTint: { value: 0.35 },
        uOpacity: { value: 1 },
      },
      vertexShader: liquidMetalVertexShader,
      fragmentShader: liquidMetalFragmentShader,
    }),
  // Firefly Swarm's particles are drawn by updateFireflySwarmOverlay
  // (fireflySwarmOverlay.ts) from EffectRenderer every frame (the particle
  // simulation itself isn't throttled, only its internal object detection
  // is) -- same overlay-blend pattern as Blob Tracker/Motion Glow.
  fireflySwarm: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tOverlay: { value: new THREE.Texture() },
        uOpacity: { value: 1 },
      },
      vertexShader: overlayBlendVertexShader,
      fragmentShader: overlayBlendFragmentShader,
    }),
  // Echo Trail's accumulation canvas is maintained by updateEchoTrailOverlay
  // (echoTrailOverlay.ts) from EffectRenderer every frame -- it's the one
  // overlay effect whose canvas persists and fades instead of being cleared
  // and redrawn each tick, which is what produces the long-exposure look.
  echoTrail: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tOverlay: { value: new THREE.Texture() },
        uOpacity: { value: 1 },
      },
      vertexShader: overlayBlendVertexShader,
      fragmentShader: overlayBlendFragmentShader,
    }),
  phosphor: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uPhosphorColor: { value: new THREE.Color('#FF4FD8') },
        uLevels: { value: 8 },
        uBrightness: { value: 1.1 },
        uGlowRadius: { value: 3 },
        uGlowStrength: { value: 0.8 },
        uScanlines: { value: 0.35 },
        uFlicker: { value: 0.03 },
        uBlackLevel: { value: new THREE.Color('#12040E') },
        uOpacity: { value: 1 },
      },
      vertexShader: phosphorVertexShader,
      fragmentShader: phosphorFragmentShader,
    }),
  receiptTicket: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uDitherScale: { value: 2 },
        uFade: { value: 0.35 },
        uContrast: { value: 1.4 },
        uInkColor: { value: new THREE.Color('#2B2B2E') },
        uPaperColor: { value: new THREE.Color('#F5F2EA') },
        uPaperNoise: { value: 0.25 },
        uHeadStreaks: { value: 0.3 },
        uBanding: { value: 0.15 },
        uPrintWidth: { value: 1.0 },
        uTornEdges: { value: 1 },
        uEdgeSize: { value: 12 },
        uOpacity: { value: 1 },
      },
      vertexShader: receiptTicketVertexShader,
      fragmentShader: receiptTicketFragmentShader,
    }),
  flashLight: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.4) },
        uIntensity: { value: 1.4 },
        uFalloff: { value: 0.3 },
        uHighlightClip: { value: 0.6 },
        uAmbient: { value: 0.25 },
        uContrast: { value: 1.5 },
        uTemperature: { value: -0.2 },
        uShadowOffset: { value: new THREE.Vector2(0.012, 0.018) },
        uShadowStrength: { value: 0.55 },
        uGrain: { value: 0.06 },
        uOpacity: { value: 1 },
      },
      vertexShader: flashLightVertexShader,
      fragmentShader: flashLightFragmentShader,
    }),
  datamosh: () =>
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uBlockSize: { value: 32 },
        uAmount: { value: 0.35 },
        uDisplacement: { value: 0.08 },
        uSmear: { value: 0.5 },
        uDirection: { value: 0 },
        uChromaBleed: { value: 0.012 },
        uQuantize: { value: 0.3 },
        uSeed: { value: 42 },
        uAnimate: { value: 0 },
        uSpeed: { value: 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: datamoshVertexShader,
      fragmentShader: datamoshFragmentShader,
    }),
}

// A `kind: 'overlay'` effect with no PASS_FACTORY entry of its own (every
// *new* overlay effect, per overlayRegistry.ts) still needs a pass to
// render -- it just always needs the exact same generic overlay-blend
// shader, so build one on demand instead of requiring a one-line factory
// per effect.
function createGenericOverlayPass(): ShaderPass {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tOverlay: { value: new THREE.Texture() },
      uOpacity: { value: 1 },
    },
    vertexShader: overlayBlendVertexShader,
    fragmentShader: overlayBlendFragmentShader,
  })
}

function isGenericOverlayEffect(effectId: string): boolean {
  return getEffectDefinition(effectId)?.kind === 'overlay' && effectId in OVERLAY_UPDATERS
}

export function isEffectRenderable(effectId: string): boolean {
  return effectId in PASS_FACTORY || isGenericOverlayEffect(effectId)
}

export function createPass(effect: AppliedEffect): ShaderPass | null {
  const factory = PASS_FACTORY[effect.effectId]
  if (!factory) {
    if (!isGenericOverlayEffect(effect.effectId)) return null
    const pass = createGenericOverlayPass()
    updatePassUniforms(pass, effect, new THREE.Vector2(1, 1))
    return pass
  }
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
      u.uInkColor.value = hexToRgb(effect.parameters.inkColor, u.uInkColor.value)
      u.uPaperColor.value = hexToRgb(effect.parameters.paperColor, u.uPaperColor.value)
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
    case 'objectGlow':
      u.uKeyColor.value = hexToRgb(effect.parameters.keyColor, u.uKeyColor.value)
      u.uThreshold.value = num(effect.parameters.threshold, 0.3)
      u.uGlowWidth.value = num(effect.parameters.glowWidth, 14)
      u.uGlowIntensity.value = num(effect.parameters.glowIntensity, 1.4)
      u.uGlowColor.value = hexToRgb(effect.parameters.glowColor, u.uGlowColor.value)
      break
    case 'colorIsolation':
      u.uKeyColor.value = hexToRgb(effect.parameters.keyColor, u.uKeyColor.value)
      u.uThreshold.value = num(effect.parameters.threshold, 0.3)
      u.uTintMode.value = effect.parameters.tintObject ? 1 : 0
      u.uTintColor.value = hexToRgb(effect.parameters.tintColor, u.uTintColor.value)
      u.uTintStrength.value = num(effect.parameters.tintStrength, 0.7)
      u.uBackgroundSaturation.value = num(effect.parameters.backgroundSaturation, 0)
      u.uBackgroundBrightness.value = num(effect.parameters.backgroundBrightness, 1)
      break
    // 'motionGlow' has no static uniforms to push here — its tOverlay is
    // populated by updateMotionGlowOverlay, called from EffectRenderer
    // where the source video is available.
    // 'objectWarp' leaves uCenterX/uCenterY untouched here — those are
    // driven by updateObjectWarpTracking from EffectRenderer. Its other
    // params (angle/radius) still come through the normal path.
    case 'objectWarp':
      u.uAngle.value = num(effect.parameters.angle, 150)
      u.uRadius.value = num(effect.parameters.radius, 160)
      break
    case 'magneticField':
      u.uKeyColor.value = hexToRgb(effect.parameters.keyColor, u.uKeyColor.value)
      u.uThreshold.value = num(effect.parameters.threshold, 0.3)
      u.uSpacing.value = num(effect.parameters.spacing, 14)
      u.uLineLength.value = num(effect.parameters.lineLength, 11)
      u.uThickness.value = num(effect.parameters.thickness, 1.4)
      u.uFalloff.value = num(effect.parameters.falloff, 60)
      u.uFlowSpeed.value = num(effect.parameters.flowSpeed, 0.6)
      u.uFieldColor.value = hexToRgb(effect.parameters.fieldColor, u.uFieldColor.value)
      break
    // 'liquidMetal' leaves uBalls untouched here -- it's driven by
    // updateMetaballTracking from EffectRenderer. Its other params still
    // come through this normal path.
    case 'liquidMetal':
      u.uMergeThreshold.value = num(effect.parameters.mergeThreshold, 1)
      u.uRefraction.value = num(effect.parameters.refraction, 18)
      u.uRimIntensity.value = num(effect.parameters.rimIntensity, 0.5)
      u.uLiquidColor.value = hexToRgb(effect.parameters.liquidColor, u.uLiquidColor.value)
      u.uTint.value = num(effect.parameters.tint, 0.35)
      break
    // 'fireflySwarm' and 'echoTrail' have no static uniforms to push here
    // -- their tOverlay textures are populated by updateFireflySwarmOverlay
    // / updateEchoTrailOverlay, called from EffectRenderer where the
    // source media is available.
    case 'phosphor': {
      const colorName = String(effect.parameters.phosphorColor ?? 'Pink')
      const hex = colorName === 'Custom' ? effect.parameters.customColor : PHOSPHOR_COLOR_MAP[colorName]
      u.uPhosphorColor.value = hexToRgb(hex, u.uPhosphorColor.value)
      u.uLevels.value = num(effect.parameters.levels, 8)
      u.uBrightness.value = num(effect.parameters.brightness, 1.1)
      u.uGlowRadius.value = num(effect.parameters.glowRadius, 3)
      u.uGlowStrength.value = num(effect.parameters.glowStrength, 0.8)
      u.uScanlines.value = num(effect.parameters.scanlines, 0.35)
      u.uFlicker.value = num(effect.parameters.flicker, 0.03)
      u.uBlackLevel.value = hexToRgb(effect.parameters.blackLevel, u.uBlackLevel.value)
      break
    }
    case 'receiptTicket':
      u.uDitherScale.value = num(effect.parameters.ditherScale, 2)
      u.uFade.value = num(effect.parameters.fade, 0.35)
      u.uContrast.value = num(effect.parameters.contrast, 1.4)
      u.uInkColor.value = hexToRgb(effect.parameters.inkColor, u.uInkColor.value)
      u.uPaperColor.value = hexToRgb(effect.parameters.paperColor, u.uPaperColor.value)
      u.uPaperNoise.value = num(effect.parameters.paperNoise, 0.25)
      u.uHeadStreaks.value = num(effect.parameters.headStreaks, 0.3)
      u.uBanding.value = num(effect.parameters.banding, 0.15)
      u.uPrintWidth.value = num(effect.parameters.printWidth, 1.0)
      u.uTornEdges.value = effect.parameters.tornEdges === false ? 0 : 1
      u.uEdgeSize.value = num(effect.parameters.edgeSize, 12)
      break
    case 'flashLight':
      u.uCenter.value.set(num(effect.parameters.centerX, 0.5), num(effect.parameters.centerY, 0.4))
      u.uIntensity.value = num(effect.parameters.intensity, 1.4)
      u.uFalloff.value = num(effect.parameters.falloff, 0.3)
      u.uHighlightClip.value = num(effect.parameters.highlightClip, 0.6)
      u.uAmbient.value = num(effect.parameters.ambient, 0.25)
      u.uContrast.value = num(effect.parameters.contrast, 1.5)
      u.uTemperature.value = num(effect.parameters.temperature, -0.2)
      u.uShadowOffset.value.set(num(effect.parameters.shadowOffsetX, 0.012), num(effect.parameters.shadowOffsetY, 0.018))
      u.uShadowStrength.value = num(effect.parameters.shadowStrength, 0.55)
      u.uGrain.value = num(effect.parameters.grain, 0.06)
      break
    case 'datamosh':
      u.uBlockSize.value = num(effect.parameters.blockSize, 32)
      u.uAmount.value = num(effect.parameters.amount, 0.35)
      u.uDisplacement.value = num(effect.parameters.displacement, 0.08)
      u.uSmear.value = num(effect.parameters.smear, 0.5)
      u.uDirection.value = DATAMOSH_DIRECTION_MAP[String(effect.parameters.direction)] ?? 0
      u.uChromaBleed.value = num(effect.parameters.chromaBleed, 0.012)
      u.uQuantize.value = num(effect.parameters.quantize, 0.3)
      u.uSeed.value = num(effect.parameters.seed, 42)
      u.uAnimate.value = effect.parameters.animate ? 1 : 0
      u.uSpeed.value = num(effect.parameters.speed, 1)
      break
  }
}

// Called once per rendered frame (not just on parameter change) so
// time-varying effects like film grain animate instead of looking frozen.
export function tickPassTime(pass: ShaderPass, elapsedSeconds: number) {
  const u = pass.uniforms
  if (u?.uTime) u.uTime.value = elapsedSeconds
}
