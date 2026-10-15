import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { createPass, updatePassUniforms } from '../engine/passes'
import { updateBlobTrackerOverlay } from './blobTrackerOverlay'
import { updateMotionGlowOverlay } from './motionGlowOverlay'
import { updateMetaballTracking } from './metaballTracking'
import { updateFireflySwarmOverlay } from './fireflySwarmOverlay'
import { updateEchoTrailOverlay } from './echoTrailOverlay'
import { getEffectDefinition } from './registry'
import { getDemoCanvas } from './thumbnailDemo'
import type { AppliedEffect, Preset } from '../types/effect'

// Renders effects (single, for the Effect Library — or a whole preset's
// chain, for the Presets tab) at their default/preset parameters, against
// the shared demo image (thumbnailDemo.ts) — real output from the real
// shaders, not hand-picked stock photos, so a new effect or preset
// automatically gets an accurate preview with zero extra asset work. One
// small offscreen renderer is reused across every thumbnail (same
// OutputPass requirement as the main EffectRenderer — see its comment for
// why that pass can't be skipped).
const THUMB_SIZE = 160
const effectCache = new Map<string, string>()
const presetCache = new Map<string, string>()

let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null

function ensureRenderer(): { renderer: THREE.WebGLRenderer; composer: EffectComposer } | null {
  if (renderer && composer) return { renderer, composer }
  if (typeof document === 'undefined') return null

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(1)
  renderer.setSize(THUMB_SIZE, THUMB_SIZE, false)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.MeshBasicMaterial({ transparent: true })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const texture = new THREE.CanvasTexture(getDemoCanvas())
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  material.map = texture
  material.needsUpdate = true

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new OutputPass())

  return { renderer, composer }
}

// Builds a ShaderPass chain for `effects` (skipping disabled ones), renders
// it once against the shared demo image, and returns a cached data URL.
// Shared by both the single-effect and whole-preset-chain thumbnail paths
// below — a preset is just effects.length > 1.
function renderThumbnail(cacheKey: string, cache: Map<string, string>, effects: AppliedEffect[]): string | null {
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const ctx = ensureRenderer()
  if (!ctx) return null
  const resolution = new THREE.Vector2(THUMB_SIZE, THUMB_SIZE)

  const createdPasses: ShaderPass[] = []
  for (const effect of effects) {
    if (!effect.enabled) continue
    const pass = createPass(effect)
    if (!pass) continue
    updatePassUniforms(pass, effect, resolution)
    if (effect.effectId === 'blobTracker') {
      updateBlobTrackerOverlay(pass, effect, getDemoCanvas(), resolution)
    }
    // Motion Glow needs a real second frame to diff against, which the
    // static demo canvas can't provide — this just makes sure tOverlay gets
    // a properly sized (if blank) texture instead of the factory's
    // zero-size placeholder, so the thumbnail renders without erroring.
    if (effect.effectId === 'motionGlow') {
      updateMotionGlowOverlay(pass, effect, getDemoCanvas(), resolution)
    }
    // Liquid Metal, Firefly Swarm and Echo Trail all need one real
    // detection/draw pass against the demo canvas too, for the same reason
    // as Motion Glow above -- without it their arrays/textures would stay
    // at factory defaults (no blobs, blank overlay).
    if (effect.effectId === 'liquidMetal') {
      updateMetaballTracking(pass, effect, getDemoCanvas(), resolution)
    }
    if (effect.effectId === 'fireflySwarm') {
      updateFireflySwarmOverlay(pass, effect, getDemoCanvas(), resolution)
    }
    if (effect.effectId === 'echoTrail') {
      updateEchoTrailOverlay(pass, effect, getDemoCanvas(), resolution)
    }
    createdPasses.push(pass)
  }
  if (createdPasses.length === 0) return null

  const renderPass = ctx.composer.passes[0]
  const outputPass = ctx.composer.passes[ctx.composer.passes.length - 1]
  const nextPasses = [renderPass, ...createdPasses, outputPass]
  nextPasses.forEach((p, i) => {
    p.renderToScreen = i === nextPasses.length - 1
  })
  ctx.composer.passes = nextPasses
  ctx.composer.render()

  const dataUrl = ctx.renderer.domElement.toDataURL('image/png')
  createdPasses.forEach((p) => p.material.dispose())
  cache.set(cacheKey, dataUrl)
  return dataUrl
}

// Synchronous: a single 160x160 render is cheap enough to do on demand
// (called from a useEffect, not during render — see useEffectThumbnail).
export function getEffectThumbnail(effectId: string): string | null {
  const def = getEffectDefinition(effectId)
  if (!def) return null
  const effect: AppliedEffect = {
    instanceId: 'thumb',
    effectId: def.id,
    name: def.name,
    enabled: true,
    opacity: 1,
    parameters: Object.fromEntries(def.parameters.map((p) => [p.id, p.value])),
  }
  return renderThumbnail(effectId, effectCache, [effect])
}

export function getPresetThumbnail(preset: Preset): string | null {
  const effects: AppliedEffect[] = preset.effects.map((e, i) => ({ ...e, instanceId: `thumb-${i}` }))
  return renderThumbnail(`preset:${preset.id}`, presetCache, effects)
}
