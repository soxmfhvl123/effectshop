// CPU-side "blob tracker" detector for the stylized Blob Tracker effect.
// Not real object detection — it draws the source frame into a small grid,
// masks pixels whose color is far from a chosen "key color" (classic
// chroma-key logic, inverted: far-from-key = foreground), finds connected
// regions in that mask, and turns them into boxes. Good enough to produce a
// plausible-looking "AI tracker" HUD without an ML dependency.

export interface BlobBox {
  id: number
  x: number // normalized 0..1, box left
  y: number // normalized 0..1, box top
  w: number // normalized 0..1
  h: number // normalized 0..1
  label: string
  color: string
}

interface RawRegion {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
}

const GRID_W = 48
const GRID_H = 36
const MIN_REGION_CELLS = 4
const MATCH_MAX_DIST = 0.14 // normalized-space distance to treat a region as "the same" blob as last detection

const LABEL_WORDS = [
  'JAKE', 'NOVA', 'ECHO', 'VOID', 'AXON', 'ZENO', 'KITE', 'RUNE', 'FLUX', 'IRIS',
  'DRIFT', 'ORBIT', 'PULSE', 'GHOST', 'SABER', 'TRACE', 'RIVER', 'STORM', 'CORE', 'HALO',
  'CHURCH', 'UNIT', 'GRID', 'SCAN', 'NODE', 'GLASS', 'MESH', 'FRAME', 'SHIFT', 'BLOOM',
]

const PALETTE = ['#22d3ee', '#f472b6', '#facc15', '#4ade80', '#a78bfa', '#fb923c', '#60a5fa', '#f87171']

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function labelForId(id: number): string {
  const a = LABEL_WORDS[Math.floor(pseudoRandom(id * 2 + 1) * LABEL_WORDS.length)]
  const b = LABEL_WORDS[Math.floor(pseudoRandom(id * 2 + 2) * LABEL_WORDS.length)]
  return `${a}_${b}`
}

function colorForId(id: number): string {
  return PALETTE[id % PALETTE.length]
}

export interface BlobDetectOptions {
  keyColor: [number, number, number]
  threshold: number // 0..1
  persistence: number // 0..1, higher = smoother/slower to move
  maxBlobs: number
}

export class BlobDetector {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private prev: BlobBox[] = []
  private nextId = 0

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = GRID_W
    this.canvas.height = GRID_H
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  }

  detect(source: CanvasImageSource, opts: BlobDetectOptions): BlobBox[] {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height

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
      return this.prev // tainted canvas (e.g. cross-origin source) — fail gracefully
    }

    const [kr, kg, kb] = opts.keyColor
    const maxDist = Math.sqrt(255 * 255 * 3)
    const threshDist = opts.threshold * maxDist

    const mask = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
      mask[i] = dist > threshDist ? 1 : 0
    }

    const visited = new Uint8Array(w * h)
    const regions: RawRegion[] = []
    const stack: number[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const start = y * w + x
        if (!mask[start] || visited[start]) continue
        let minX = x
        let maxX = x
        let minY = y
        let maxY = y
        let count = 0
        stack.push(start)
        visited[start] = 1
        while (stack.length > 0) {
          const cur = stack.pop() as number
          const cx = cur % w
          const cy = (cur / w) | 0
          count++
          if (cx < minX) minX = cx
          if (cx > maxX) maxX = cx
          if (cy < minY) minY = cy
          if (cy > maxY) maxY = cy

          if (cx > 0 && mask[cur - 1] && !visited[cur - 1]) {
            visited[cur - 1] = 1
            stack.push(cur - 1)
          }
          if (cx < w - 1 && mask[cur + 1] && !visited[cur + 1]) {
            visited[cur + 1] = 1
            stack.push(cur + 1)
          }
          if (cur - w >= 0 && mask[cur - w] && !visited[cur - w]) {
            visited[cur - w] = 1
            stack.push(cur - w)
          }
          if (cur + w < w * h && mask[cur + w] && !visited[cur + w]) {
            visited[cur + w] = 1
            stack.push(cur + w)
          }
        }
        if (count >= MIN_REGION_CELLS) regions.push({ minX, minY, maxX, maxY, count })
      }
    }

    regions.sort((a, b) => b.count - a.count)
    const top = regions.slice(0, Math.max(1, Math.round(opts.maxBlobs)))

    const rawBoxes = top.map((r) => ({
      x: r.minX / w,
      y: r.minY / h,
      w: (r.maxX - r.minX + 1) / w,
      h: (r.maxY - r.minY + 1) / h,
    }))

    const usedPrevIds = new Set<number>()
    const result: BlobBox[] = []
    for (const raw of rawBoxes) {
      const rcx = raw.x + raw.w / 2
      const rcy = raw.y + raw.h / 2
      let best: BlobBox | undefined
      let bestDist = MATCH_MAX_DIST
      for (const p of this.prev) {
        if (usedPrevIds.has(p.id)) continue
        const pcx = p.x + p.w / 2
        const pcy = p.y + p.h / 2
        const d = Math.hypot(rcx - pcx, rcy - pcy)
        if (d < bestDist) {
          bestDist = d
          best = p
        }
      }

      if (best) {
        usedPrevIds.add(best.id)
        const k = Math.min(Math.max(opts.persistence, 0), 0.95)
        result.push({
          id: best.id,
          x: best.x + (raw.x - best.x) * (1 - k),
          y: best.y + (raw.y - best.y) * (1 - k),
          w: best.w + (raw.w - best.w) * (1 - k),
          h: best.h + (raw.h - best.h) * (1 - k),
          label: best.label,
          color: best.color,
        })
      } else {
        const id = this.nextId++
        result.push({ ...raw, id, label: labelForId(id), color: colorForId(id) })
      }
    }

    this.prev = result
    return result
  }
}
