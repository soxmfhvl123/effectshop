import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { BlobDetector } from './blobDetector'
import { getOverlayCanvas } from './overlayCanvas'

// One detector per pass instance, so each Blob Tracker layer in the
// pipeline tracks independently and keeps its own stable id/label/color
// assignments across frames.
const detectorMap = new WeakMap<ShaderPass, BlobDetector>()

function hexToRgbTuple(hex: unknown, fallback: [number, number, number]): [number, number, number] {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

function drawCornerBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  thickness: number,
) {
  const arm = Math.min(w, h) * 0.3
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.beginPath()
  ctx.moveTo(x, y + arm)
  ctx.lineTo(x, y)
  ctx.lineTo(x + arm, y)
  ctx.moveTo(x + w - arm, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + arm)
  ctx.moveTo(x + w, y + h - arm)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w - arm, y + h)
  ctx.moveTo(x + arm, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + h - arm)
  ctx.stroke()
}

// Runs blob detection against the current source frame and redraws this
// pass's overlay canvas with HUD-style corner boxes, tracking-ID labels and
// dashed connector lines. Called from EffectRenderer: once per media change
// for images, and on a throttled interval during video playback (real-time
// per-frame pixel readback would be wasted work for a per-frame-static
// visual that only needs to refresh a few times a second to read as "live
// tracking").
export function updateBlobTrackerOverlay(
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
  const keyColor = hexToRgbTuple(p.keyColor, [255, 255, 255])
  const boxes = detector.detect(source, {
    keyColor,
    threshold: typeof p.threshold === 'number' ? p.threshold : 0.25,
    persistence: typeof p.persistence === 'number' ? p.persistence : 0.8,
    maxBlobs: typeof p.maxBlobs === 'number' ? p.maxBlobs : 6,
  })

  const { ctx, canvas, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const randomPalette = p.randomPalette !== false
  const fixedColor = typeof p.boxColor === 'string' ? p.boxColor : '#22d3ee'
  const thickness = typeof p.boxThickness === 'number' ? p.boxThickness : 1.5
  const showLabels = p.showLabels !== false
  const showLines = p.showLines !== false

  if (showLines && boxes.length > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i]
      const b = boxes[i + 1]
      ctx.moveTo((a.x + a.w / 2) * canvas.width, (a.y + a.h / 2) * canvas.height)
      ctx.lineTo((b.x + b.w / 2) * canvas.width, (b.y + b.h / 2) * canvas.height)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  for (const box of boxes) {
    const x = box.x * canvas.width
    const y = box.y * canvas.height
    const w = box.w * canvas.width
    const h = box.h * canvas.height
    const color = randomPalette ? box.color : fixedColor
    drawCornerBox(ctx, x, y, w, h, color, thickness)

    if (showLabels) {
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillStyle = color
      ctx.textBaseline = 'bottom'
      ctx.textAlign = 'left'
      ctx.fillText(box.label, x, Math.max(12, y - 3))
    }
  }

  texture.needsUpdate = true
  const u = pass.uniforms
  if (u?.tOverlay) u.tOverlay.value = texture
}
