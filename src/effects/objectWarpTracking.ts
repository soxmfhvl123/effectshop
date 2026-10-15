import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { BlobDetector } from './blobDetector'

// Finds the primary (largest) detected blob each tick and eases the
// swirl-based pass's center toward it, so the distortion visually "follows"
// whatever's furthest from the key color — no overlay canvas needed here,
// this only pushes two numeric uniforms directly.
const detectorMap = new WeakMap<ShaderPass, BlobDetector>()
const centerMap = new WeakMap<ShaderPass, { x: number; y: number }>()

export function updateObjectWarpTracking(pass: ShaderPass, effect: AppliedEffect, source: CanvasImageSource) {
  let detector = detectorMap.get(pass)
  if (!detector) {
    detector = new BlobDetector()
    detectorMap.set(pass, detector)
  }

  const p = effect.parameters
  const keyColor = hexToRgbTuple(p.keyColor, [0, 0, 0])
  const threshold = typeof p.threshold === 'number' ? p.threshold : 0.3
  const smoothing = typeof p.smoothing === 'number' ? p.smoothing : 0.8

  const blobs = detector.detect(source, {
    keyColor,
    threshold,
    persistence: 0,
    maxBlobs: 1,
  })

  const prev = centerMap.get(pass) ?? { x: 0.5, y: 0.5 }
  if (blobs.length > 0) {
    const b = blobs[0]
    const targetX = b.x + b.w / 2
    const targetY = b.y + b.h / 2
    const k = Math.min(Math.max(smoothing, 0), 0.98)
    prev.x += (targetX - prev.x) * (1 - k)
    prev.y += (targetY - prev.y) * (1 - k)
  }
  centerMap.set(pass, prev)

  const u = pass.uniforms
  if (u?.uCenterX) u.uCenterX.value = prev.x
  if (u?.uCenterY) u.uCenterY.value = 1 - prev.y
}

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}
