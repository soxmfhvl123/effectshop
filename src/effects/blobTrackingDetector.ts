// CPU-side saliency detector for Blob Tracking. Unlike blobDetector.ts
// (chroma-key: "far from a chosen color"), this needs no key color at all --
// it scores every pixel by one of three general "interesting" measures
// (Brightness, Saturation, or Sobel edge magnitude) and finds connected
// regions above a threshold, so it works on arbitrary photos out of the box.
import { findRegions } from './connectedComponents'

export type BlobTrackingMode = 'Brightness' | 'Saturation' | 'Edges'

export interface TrackedBlob {
  id: number
  x: number // normalized 0..1, canvas-space (y=0 top), box left
  y: number
  w: number
  h: number
}

export interface BlobTrackingOptions {
  mode: BlobTrackingMode
  threshold: number // 0..1
  maxBlobs: number
  minSize: number // 0..1, box's larger dimension as a fraction of the frame
}

const GRID_W = 96
const MIN_REGION_CELLS = 3
const MATCH_MAX_DIST = 0.16

function sobelScore(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    lum[i] = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255
  }
  const mag = new Float32Array(w * h)
  let maxMag = 0.0001
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] + lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1]
      const gy = -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] + lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1]
      const m = Math.sqrt(gx * gx + gy * gy)
      mag[i] = m
      if (m > maxMag) maxMag = m
    }
  }
  for (let i = 0; i < w * h; i++) mag[i] /= maxMag
  return mag
}

export class BlobTrackingDetector {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private prev: TrackedBlob[] = []
  private nextId = 0

  constructor() {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  }

  detect(source: CanvasImageSource, sourceW: number, sourceH: number, opts: BlobTrackingOptions): TrackedBlob[] {
    const w = GRID_W
    const h = Math.max(8, Math.round(GRID_W * (sourceH / Math.max(sourceW, 1))))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    const ctx = this.ctx

    try {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(source, 0, 0, w, h)
    } catch {
      return this.prev
    }

    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, 0, w, h).data
    } catch {
      return this.prev
    }

    const score = new Float32Array(w * h)
    if (opts.mode === 'Edges') {
      score.set(sobelScore(data, w, h))
    } else {
      for (let i = 0; i < w * h; i++) {
        const o = i * 4
        const r = data[o]
        const g = data[o + 1]
        const b = data[o + 2]
        if (opts.mode === 'Brightness') {
          score[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        } else {
          const mx = Math.max(r, g, b)
          const mn = Math.min(r, g, b)
          score[i] = mx === 0 ? 0 : (mx - mn) / mx
        }
      }
    }

    const mask = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) mask[i] = score[i] > opts.threshold ? 1 : 0

    const regions = findRegions(mask, w, h, MIN_REGION_CELLS)
    const scored = regions.map((r) => {
      let sum = 0
      let count = 0
      for (let y = r.minY; y <= r.maxY; y++) {
        for (let x = r.minX; x <= r.maxX; x++) {
          sum += score[y * w + x]
          count++
        }
      }
      return {
        x: r.minX / w,
        y: r.minY / h,
        w: (r.maxX - r.minX + 1) / w,
        h: (r.maxY - r.minY + 1) / h,
        avgScore: count ? sum / count : 0,
      }
    })

    const picked = scored
      .filter((b) => Math.max(b.w, b.h) >= opts.minSize)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, Math.max(1, Math.round(opts.maxBlobs)))

    const usedPrevIds = new Set<number>()
    const result: TrackedBlob[] = []
    for (const b of picked) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      let best: TrackedBlob | undefined
      let bestDist = MATCH_MAX_DIST
      for (const p of this.prev) {
        if (usedPrevIds.has(p.id)) continue
        const pcx = p.x + p.w / 2
        const pcy = p.y + p.h / 2
        const d = Math.hypot(cx - pcx, cy - pcy)
        if (d < bestDist) {
          bestDist = d
          best = p
        }
      }
      if (best) {
        usedPrevIds.add(best.id)
        result.push({ id: best.id, x: b.x, y: b.y, w: b.w, h: b.h })
      } else {
        result.push({ id: this.nextId++, x: b.x, y: b.y, w: b.w, h: b.h })
      }
    }

    this.prev = result
    return result
  }
}
