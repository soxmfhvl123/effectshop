// CPU-side frame-difference motion detector. Unlike BlobDetector (which
// masks by color distance from a fixed key color, so it works on a single
// still frame), this needs two frames — it only produces anything once it
// has seen a previous frame to diff against, so it's genuinely video-only;
// a static image always reports zero motion blobs, which is correct, not
// a bug.

import { findRegions } from './connectedComponents'

export interface MotionBlob {
  x: number // normalized 0..1
  y: number
  w: number
  h: number
  intensity: number // 0..1, roughly how much that region changed
}

const GRID_W = 48
const GRID_H = 36
const MIN_REGION_CELLS = 2

export class MotionDetector {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private prevFrame: Uint8ClampedArray | null = null

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = GRID_W
    this.canvas.height = GRID_H
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  }

  // sensitivity 0..1 — higher finds smaller/subtler motion
  detect(source: CanvasImageSource, sensitivity: number, maxBlobs: number): MotionBlob[] {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height

    try {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(source, 0, 0, w, h)
    } catch {
      return []
    }

    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, 0, w, h).data
    } catch {
      return [] // tainted canvas — fail gracefully
    }

    const prev = this.prevFrame
    if (!prev) {
      this.prevFrame = data
      return []
    }

    const threshold = (1 - Math.min(Math.max(sensitivity, 0), 1)) * 140 + 10
    const mask = new Uint8Array(w * h)
    const diffMap = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const o = i * 4
      const diff = Math.abs(data[o] - prev[o]) + Math.abs(data[o + 1] - prev[o + 1]) + Math.abs(data[o + 2] - prev[o + 2])
      diffMap[i] = diff
      mask[i] = diff > threshold ? 1 : 0
    }
    this.prevFrame = data

    const regions = findRegions(mask, w, h, MIN_REGION_CELLS)
    regions.sort((a, b) => b.count - a.count)
    const top = regions.slice(0, Math.max(1, Math.round(maxBlobs)))

    return top.map((r) => {
      let peak = 0
      for (let y = r.minY; y <= r.maxY; y++) {
        for (let x = r.minX; x <= r.maxX; x++) {
          const d = diffMap[y * w + x]
          if (d > peak) peak = d
        }
      }
      return {
        x: r.minX / w,
        y: r.minY / h,
        w: (r.maxX - r.minX + 1) / w,
        h: (r.maxY - r.minY + 1) / h,
        intensity: Math.min(1, peak / 400),
      }
    })
  }
}
