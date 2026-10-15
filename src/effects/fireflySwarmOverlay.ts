import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { BlobDetector } from './blobDetector'
import { getOverlayCanvas } from './overlayCanvas'

// A swarm of glowing particles that orbit whatever's detected as the
// "object", each on its own slightly-randomized orbit radius/speed/phase so
// the swarm reads as alive rather than a rigid ring. Unlike Motion Glow
// (small puffs that mark where motion just happened), this is a persistent
// population that's always drawn, continuously simulated every frame for
// smooth motion -- only the underlying object detection itself is
// throttled internally, independent of EffectRenderer's shared blob-update
// cadence, since particle motion needs to stay smooth even while detection
// doesn't.
interface Firefly {
  angle: number
  orbitRadius: number
  orbitSpeed: number
  radialPhase: number
  radialSpeed: number
  size: number
  hueJitter: number
  flickerPhase: number
}

interface SwarmState {
  detector: BlobDetector
  fireflies: Firefly[]
  targetX: number
  targetY: number
  targetScale: number // ~object size, scales the orbit radius
  lastDetectAt: number
  lastFrameAt: number
}

const stateMap = new WeakMap<ShaderPass, SwarmState>()
const DETECT_INTERVAL_MS = 150

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

function makeFirefly(): Firefly {
  return {
    angle: Math.random() * Math.PI * 2,
    orbitRadius: 0.5 + Math.random() * 1.2,
    orbitSpeed: (0.3 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1),
    radialPhase: Math.random() * Math.PI * 2,
    radialSpeed: 0.5 + Math.random() * 1.5,
    size: 1.5 + Math.random() * 2.5,
    hueJitter: Math.random(),
    flickerPhase: Math.random() * Math.PI * 2,
  }
}

function hslToRgbString(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

export function updateFireflySwarmOverlay(
  pass: ShaderPass,
  effect: AppliedEffect,
  source: CanvasImageSource,
  resolution: THREE.Vector2,
) {
  const now = performance.now()
  let state = stateMap.get(pass)
  if (!state) {
    state = {
      detector: new BlobDetector(),
      fireflies: [],
      targetX: 0.5,
      targetY: 0.5,
      targetScale: 60,
      lastDetectAt: 0,
      lastFrameAt: now,
    }
    stateMap.set(pass, state)
  }

  const p = effect.parameters
  const count = Math.round(typeof p.count === 'number' ? p.count : 50)
  const swarmRadius = typeof p.swarmRadius === 'number' ? p.swarmRadius : 80
  const orbitSpeedScale = typeof p.orbitSpeed === 'number' ? p.orbitSpeed : 1
  const size = typeof p.size === 'number' ? p.size : 1
  const trailDecay = typeof p.trailDecay === 'number' ? p.trailDecay : 0.12
  const hueBase = typeof p.hue === 'number' ? p.hue : 0.12 // warm firefly glow by default
  const hueRange = typeof p.hueRange === 'number' ? p.hueRange : 0.08
  const flicker = typeof p.flicker === 'number' ? p.flicker : 0.5
  const keyColor = hexToRgbTuple(p.keyColor, [0, 0, 0])
  const threshold = typeof p.threshold === 'number' ? p.threshold : 0.3

  while (state.fireflies.length < count) state.fireflies.push(makeFirefly())
  if (state.fireflies.length > count) state.fireflies.length = count

  if (now - state.lastDetectAt >= DETECT_INTERVAL_MS) {
    state.lastDetectAt = now
    const blobs = state.detector.detect(source, { keyColor, threshold, persistence: 0.6, maxBlobs: 1 })
    if (blobs.length > 0) {
      const b = blobs[0]
      state.targetX = b.x + b.w / 2
      state.targetY = b.y + b.h / 2
      state.targetScale = Math.max(30, Math.sqrt(b.w * resolution.x * (b.h * resolution.y)) * 0.6)
    }
  }

  const dt = Math.min(0.1, (now - state.lastFrameAt) / 1000)
  state.lastFrameAt = now

  const { ctx, canvas, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
  // Fade the previous frame's particles instead of clearing outright --
  // 'destination-out' multiplies existing alpha down each tick, producing
  // soft fading comet trails purely from 2D canvas compositing.
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = `rgba(0,0,0,${trailDecay})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.globalCompositeOperation = 'lighter'
  const cx = state.targetX * canvas.width
  const cy = state.targetY * canvas.height
  const baseRadius = swarmRadius * (state.targetScale / 60)

  for (const f of state.fireflies) {
    f.angle += f.orbitSpeed * orbitSpeedScale * dt
    f.radialPhase += f.radialSpeed * dt
    const r = baseRadius * f.orbitRadius * (0.85 + 0.15 * Math.sin(f.radialPhase))
    const x = cx + Math.cos(f.angle) * r
    const y = cy + Math.sin(f.angle) * r * 0.85 // slight ellipse for a less perfectly-circular orbit

    f.flickerPhase += dt * 6
    const flickerAmt = 1 - flicker + flicker * (0.5 + 0.5 * Math.sin(f.flickerPhase))
    const alpha = Math.max(0, flickerAmt)
    if (alpha <= 0.02) continue

    const hue = (hueBase + (f.hueJitter - 0.5) * hueRange + 1) % 1
    const radius = f.size * size * (resolution.x / 480)
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
    grad.addColorStop(0, hslToRgbString(hue, 0.9, 0.75))
    grad.addColorStop(0.3, hslToRgbString(hue, 0.9, 0.6))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  texture.needsUpdate = true
  const u = pass.uniforms
  if (u?.tOverlay) u.tOverlay.value = texture
}
