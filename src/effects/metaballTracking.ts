import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { BlobDetector } from './blobDetector'
import { MAX_METABALLS } from './shaders/liquidMetal'

// Detects every blob, then pushes each one's pixel-space center + an
// approximate radius (geometric mean of its box's half-width/half-height)
// into the liquidMetal pass's uBalls array. Unused slots get radius 0, which
// the shader's field function treats as "no contribution" -- no separate
// count uniform needed.
const detectorMap = new WeakMap<ShaderPass, BlobDetector>()

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

export function updateMetaballTracking(
  pass: ShaderPass,
  effect: AppliedEffect,
  source: CanvasImageSource,
  resolution: THREE.Vector2,
) {
  let detector = detectorMap.get(pass)
  if (!detector) {
    detector = new BlobDetector()
    detectorMap.set(pass, detector)
  }

  const p = effect.parameters
  const keyColor = hexToRgbTuple(p.keyColor, [0, 0, 0])
  const threshold = typeof p.threshold === 'number' ? p.threshold : 0.3
  const maxBlobs = typeof p.maxBlobs === 'number' ? p.maxBlobs : MAX_METABALLS
  const radiusScale = typeof p.radiusScale === 'number' ? p.radiusScale : 1

  const blobs = detector.detect(source, {
    keyColor,
    threshold,
    persistence: 0.5,
    maxBlobs: Math.min(maxBlobs, MAX_METABALLS),
  })

  const u = pass.uniforms
  if (!u?.uBalls) return
  const balls: THREE.Vector3[] = u.uBalls.value
  for (let i = 0; i < MAX_METABALLS; i++) {
    const b = blobs[i]
    if (!b) {
      balls[i].set(0, 0, 0)
      continue
    }
    const cx = (b.x + b.w / 2) * resolution.x
    const cy = (1 - (b.y + b.h / 2)) * resolution.y
    const radius = Math.sqrt(b.w * resolution.x * (b.h * resolution.y)) * 0.5 * radiusScale
    balls[i].set(cx, cy, radius)
  }
}
