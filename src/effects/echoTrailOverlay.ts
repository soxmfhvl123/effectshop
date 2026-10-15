import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { getOverlayCanvas } from './overlayCanvas'

// A real accumulation buffer (not a JS particle pool, not a GPU render
// target -- a persistent Canvas2D surface that's faded instead of cleared
// each tick) holding a long-exposure "echo" of the detected object's actual
// masked silhouette, built from a soft per-pixel key-color distance rather
// than a blob bounding box. Every other overlay effect in this codebase
// wipes its canvas and redraws fresh each update; this is the first one
// that lets content persist and decay across frames, which is what gives
// it the light-painting/feedback-loop look instead of a flat silhouette.
interface EchoState {
  work: HTMLCanvasElement
  workCtx: CanvasRenderingContext2D
  lastFrameAt: number
}

const stateMap = new WeakMap<ShaderPass, EchoState>()
const WORK_W = 192
const WORK_H = 128

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

export function updateEchoTrailOverlay(
  pass: ShaderPass,
  effect: AppliedEffect,
  source: CanvasImageSource,
  resolution: THREE.Vector2,
) {
  const now = performance.now()
  let state = stateMap.get(pass)
  if (!state) {
    const work = document.createElement('canvas')
    work.width = WORK_W
    work.height = WORK_H
    const workCtx = work.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    state = { work, workCtx, lastFrameAt: now }
    stateMap.set(pass, state)
  }

  const p = effect.parameters
  const [kr, kg, kb] = hexToRgbTuple(p.keyColor, [0, 0, 0])
  const threshold = typeof p.threshold === 'number' ? p.threshold : 0.3
  const decay = typeof p.decay === 'number' ? p.decay : 0.08 // per-tick fade, higher = shorter trail
  const exposure = typeof p.exposure === 'number' ? p.exposure : 0.85
  const tintStrength = typeof p.tintStrength === 'number' ? p.tintStrength : 0.4
  const [tr, tg, tb] = hexToRgbTuple(p.tintColor, [255, 60, 180])

  const { workCtx: wctx, work } = state
  try {
    wctx.clearRect(0, 0, WORK_W, WORK_H)
    wctx.drawImage(source, 0, 0, WORK_W, WORK_H)
  } catch {
    return
  }

  let imageData: ImageData
  try {
    imageData = wctx.getImageData(0, 0, WORK_W, WORK_H)
  } catch {
    return
  }

  const maxDist = Math.sqrt(255 * 255 * 3)
  const threshDist = threshold * maxDist
  const softBand = Math.max(8, maxDist * 0.06)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
    const alpha = Math.max(0, Math.min(1, (dist - threshDist) / softBand))
    data[i] = r + (tr - r) * tintStrength
    data[i + 1] = g + (tg - g) * tintStrength
    data[i + 2] = b + (tb - b) * tintStrength
    data[i + 3] = Math.round(alpha * 255 * exposure)
  }
  wctx.putImageData(imageData, 0, 0)

  const { ctx, canvas, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, Math.max(0, decay))})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(work, 0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'source-over'

  texture.needsUpdate = true
  const u = pass.uniforms
  if (u?.tOverlay) u.tOverlay.value = texture
  state.lastFrameAt = now
}
