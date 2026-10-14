import * as THREE from 'three'

// Builds a 1-row texture atlas of glyphs (white ink on black, alpha channel
// unused) for a given character ramp, light -> dense. Used by the ASCII Art
// shader to look up "which character" a screen cell should show, then sample
// that glyph's cell of this atlas for the actual pixels.
export interface CharAtlas {
  texture: THREE.CanvasTexture
  charCount: number
}

const CHARSETS: Record<string, string> = {
  standard: ' .:-=+*#%@',
  minimal: ' .:#',
  blocks: ' ░▒▓█',
}

const cache = new Map<string, CharAtlas>()

const CELL_PX = 32 // glyph cell size in the atlas texture, in pixels

export function getCharAtlas(charSet: string): CharAtlas {
  const ramp = CHARSETS[charSet] ?? CHARSETS.standard
  const cached = cache.get(charSet)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = CELL_PX * ramp.length
  canvas.height = CELL_PX
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${Math.floor(CELL_PX * 0.82)}px "JetBrains Mono", ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < ramp.length; i++) {
    ctx.fillText(ramp[i], i * CELL_PX + CELL_PX / 2, CELL_PX / 2 + 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  const atlas: CharAtlas = { texture, charCount: ramp.length }
  cache.set(charSet, atlas)
  return atlas
}
