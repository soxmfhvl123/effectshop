import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { MotionDetector } from './motionDetector'
import { getOverlayCanvas } from './overlayCanvas'

// Trail persistence lives in plain JS arrays (not a GPU ping-pong render
// target) — far simpler than a true feedback-buffer trail, and visually
// close enough: each detected motion blob spawns a particle that fades out
// over `trailDuration`, so recently-moved areas keep glowing briefly after
// the motion itself has passed, giving the same "trail" read.
interface TrailParticle {
  x: number
  y: number
  intensity: number
  bornAt: number
}

interface MotionGlowState {
  detector: MotionDetector
  particles: TrailParticle[]
}

const stateMap = new WeakMap<ShaderPass, MotionGlowState>()

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

// Called from EffectRenderer on the same throttle as Blob Tracker (not
// every frame — pixel readback is the expensive part). Spawns new trail
// particles from this tick's detected motion, ages/drops old ones, and
// redraws this pass's overlay canvas.
export function updateMotionGlowOverlay(
  pass: ShaderPass,
  effect: AppliedEffect,
  source: CanvasImageSource,
  resolution: THREE.Vector2,
) {
  let state = stateMap.get(pass)
  if (!state) {
    state = { detector: new MotionDetector(), particles: [] }
    stateMap.set(pass, state)
  }

  const p = effect.parameters
  const sensitivity = typeof p.sensitivity === 'number' ? p.sensitivity : 0.5
  const maxBlobs = typeof p.maxBlobs === 'number' ? p.maxBlobs : 12
  const trailDuration = (typeof p.trailDuration === 'number' ? p.trailDuration : 0.6) * 1000
  const [r, g, b] = hexToRgbTuple(p.glowColor, [0, 255, 200])
  const intensityScale = typeof p.intensity === 'number' ? p.intensity : 1.5

  const blobs = state.detector.detect(source, sensitivity, maxBlobs)
  const now = performance.now()
  for (const blob of blobs) {
    state.particles.push({
      x: blob.x + blob.w / 2,
      y: blob.y + blob.h / 2,
      intensity: blob.intensity,
      bornAt: now,
    })
  }
  state.particles = state.particles.filter((pt) => now - pt.bornAt < trailDuration)

  const { ctx, canvas, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'lighter'
  for (const pt of state.particles) {
    const age = now - pt.bornAt
    const t = 1 - age / trailDuration
    const alpha = Math.max(0, t * pt.intensity * intensityScale)
    if (alpha <= 0.01) continue
    const radius = (8 + (1 - t) * 26) * (resolution.x / 480)
    const cx = pt.x * canvas.width
    const cy = pt.y * canvas.height
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    grad.addColorStop(0, `rgba(${r},${g},${b},${Math.min(1, alpha)})`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  texture.needsUpdate = true
  const u = pass.uniforms
  if (u?.tOverlay) u.tOverlay.value = texture
}
