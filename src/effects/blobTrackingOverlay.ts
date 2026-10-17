import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { BlobTrackingDetector, type BlobTrackingMode, type TrackedBlob } from './blobTrackingDetector'
import { getOverlayCanvas } from './overlayCanvas'

// Draws boxes/connector-lines/labels for every detected blob, same overlay-
// canvas-as-texture pattern as every other overlay effect. The one thing
// that's different here is "fill" (Invert/Threshold/Tint): rather than a
// dedicated shader + uBoxes array uniform, the box's pixels are composited
// straight into the overlay canvas with Canvas2D (difference-blend for
// Invert, a thresholded sub-image for Threshold, source-atop for Tint),
// drawing directly from `source` each time (no intermediate buffer canvas)
// -- keeps this effect on the same generic overlay-blend shader as
// everything else instead of needing its own fragment shader.
interface BlobTrackingState {
  detector: BlobTrackingDetector
}

const stateMap = new WeakMap<ShaderPass, BlobTrackingState>()

function hashLabel(id: number, seed: number): string {
  const x = Math.sin(id * 12.9898 + seed * 78.233) * 43758.5453
  const n = Math.floor((x - Math.floor(x)) * 100)
  return String(n).padStart(2, '0')
}

function drawConnections(ctx: CanvasRenderingContext2D, blobs: TrackedBlob[], centers: [number, number][], connect: string, color: string, strokeWidth: number) {
  if (connect === 'None' || blobs.length < 2) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(0.5, strokeWidth * 0.6)
  ctx.globalAlpha = 0.5

  if (connect === 'Nearest') {
    for (let i = 0; i < centers.length; i++) {
      let best = -1
      let bestDist = Infinity
      for (let j = 0; j < centers.length; j++) {
        if (i === j) continue
        const d = Math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1])
        if (d < bestDist) {
          bestDist = d
          best = j
        }
      }
      if (best >= 0) {
        ctx.beginPath()
        ctx.moveTo(centers[i][0], centers[i][1])
        ctx.lineTo(centers[best][0], centers[best][1])
        ctx.stroke()
      }
    }
  } else if (connect === 'Chain') {
    const order = centers.map((_, i) => i).sort((a, b) => centers[a][0] - centers[b][0])
    ctx.beginPath()
    order.forEach((idx, k) => {
      const [x, y] = centers[idx]
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  } else if (connect === 'All') {
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        ctx.beginPath()
        ctx.moveTo(centers[i][0], centers[i][1])
        ctx.lineTo(centers[j][0], centers[j][1])
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

function applyFill(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  canvasWidth: number,
  canvasHeight: number,
  box: { bx: number; by: number; bw: number; bh: number },
  mode: string,
  tintColor: string,
) {
  const { bx, by, bw, bh } = box
  if (bw < 1 || bh < 1) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(bx, by, bw, bh)
  ctx.clip()

  try {
    if (mode === 'Invert') {
      ctx.drawImage(source, 0, 0, canvasWidth, canvasHeight)
      ctx.globalCompositeOperation = 'difference'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(bx, by, bw, bh)
      ctx.globalCompositeOperation = 'source-over'
    } else if (mode === 'Threshold') {
      ctx.drawImage(source, 0, 0, canvasWidth, canvasHeight)
      const img = ctx.getImageData(bx, by, bw, bh)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const v = lum > 128 ? 255 : 0
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
      }
      ctx.putImageData(img, bx, by)
    } else if (mode === 'Tint') {
      ctx.drawImage(source, 0, 0, canvasWidth, canvasHeight)
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = 0.45
      ctx.fillStyle = tintColor
      ctx.fillRect(bx, by, bw, bh)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
  } catch {
    // tainted canvas (cross-origin source) -- skip the fill, box/label still draw
  }
  ctx.restore()
}

function drawBoxShape(ctx: CanvasRenderingContext2D, box: { bx: number; by: number; bw: number; bh: number }, style: string, color: string, strokeWidth: number) {
  const { bx, by, bw, bh } = box
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth

  if (style === 'Full') {
    ctx.strokeRect(bx, by, bw, bh)
  } else if (style === 'Corners') {
    const cl = Math.max(4, Math.min(bw, bh) * 0.25)
    ctx.beginPath()
    const corners: [number, number, number, number][] = [
      [bx, by, 1, 1],
      [bx + bw, by, -1, 1],
      [bx, by + bh, 1, -1],
      [bx + bw, by + bh, -1, -1],
    ]
    for (const [x, y, sx, sy] of corners) {
      ctx.moveTo(x, y + cl * sy)
      ctx.lineTo(x, y)
      ctx.lineTo(x + cl * sx, y)
    }
    ctx.stroke()
  } else if (style === 'Crosshair') {
    const cx = bx + bw / 2
    const cy = by + bh / 2
    ctx.beginPath()
    ctx.moveTo(bx, cy)
    ctx.lineTo(bx + bw, cy)
    ctx.moveTo(cx, by)
    ctx.lineTo(cx, by + bh)
    ctx.stroke()
  }
}

export function updateBlobTrackingOverlay(pass: ShaderPass, effect: AppliedEffect, source: CanvasImageSource, resolution: THREE.Vector2) {
  let state = stateMap.get(pass)
  if (!state) {
    state = { detector: new BlobTrackingDetector() }
    stateMap.set(pass, state)
  }

  const p = effect.parameters
  const mode = (typeof p.detectMode === 'string' ? p.detectMode : 'Edges') as BlobTrackingMode
  const threshold = typeof p.threshold === 'number' ? p.threshold : 0.55
  const maxBlobs = typeof p.maxBlobs === 'number' ? p.maxBlobs : 14
  const minSize = typeof p.minSize === 'number' ? p.minSize : 0.04
  const boxStyle = typeof p.boxStyle === 'string' ? p.boxStyle : 'Full'
  const connect = typeof p.connect === 'string' ? p.connect : 'Nearest'
  const label = typeof p.label === 'string' ? p.label : 'ID+Coords'
  const fill = typeof p.fill === 'string' ? p.fill : 'Invert'
  const color = typeof p.color === 'string' ? p.color : '#FFFFFF'
  const strokeWidth = typeof p.strokeWidth === 'number' ? p.strokeWidth : 1
  const fontSize = typeof p.fontSize === 'number' ? p.fontSize : 10
  const seed = typeof p.seed === 'number' ? p.seed : 7

  const blobs = state.detector.detect(source, resolution.x, resolution.y, { mode, threshold, maxBlobs, minSize })

  const { ctx, canvas, texture } = getOverlayCanvas(pass, resolution.x, resolution.y)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const boxes = blobs.map((b) => ({ bx: b.x * canvas.width, by: b.y * canvas.height, bw: b.w * canvas.width, bh: b.h * canvas.height }))
  const centers: [number, number][] = boxes.map((b) => [b.bx + b.bw / 2, b.by + b.bh / 2])

  drawConnections(ctx, blobs, centers, connect, color, strokeWidth)

  blobs.forEach((b, i) => {
    const box = boxes[i]
    if (fill !== 'None') applyFill(ctx, source, canvas.width, canvas.height, box, fill, color)
    drawBoxShape(ctx, box, boxStyle, color, strokeWidth)

    if (label !== 'None') {
      const idLabel = `#${hashLabel(b.id, seed)}`
      const coordLabel = `${Math.round(b.x * resolution.x)},${Math.round(b.y * resolution.y)}`
      const text = label === 'ID' ? idLabel : label === 'Coords' ? coordLabel : `${idLabel} ${coordLabel}`
      ctx.font = `${fontSize}px monospace`
      ctx.fillStyle = color
      ctx.fillText(text, box.bx, Math.max(fontSize, box.by - 4))
    }
  })

  texture.needsUpdate = true
  const u = pass.uniforms
  if (u?.tOverlay) u.tOverlay.value = texture
}
