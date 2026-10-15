// Generic 4-neighbor connected-component labeling over a binary mask on a
// small grid — shared by BlobDetector (chroma-key mask) and MotionDetector
// (frame-diff mask), since "turn a 0/1 grid into a list of bounding boxes"
// is identical either way; only how the mask gets built differs.

export interface Region {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
}

export function findRegions(mask: Uint8Array, w: number, h: number, minCells: number): Region[] {
  const visited = new Uint8Array(w * h)
  const regions: Region[] = []
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
      if (count >= minCells) regions.push({ minX, minY, maxX, maxY, count })
    }
  }

  return regions
}
