import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

// Per-pass Canvas2D scratch surface + the CanvasTexture that wraps it, used
// by any effect whose overlay content (text, HUD boxes/labels) is authored
// with the Canvas2D API rather than GLSL. Keyed by the owning ShaderPass so
// each effect instance gets its own canvas and they're freed automatically
// when the pass itself is garbage-collected.
export interface OverlayCanvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture
}

const overlayMap = new WeakMap<ShaderPass, OverlayCanvas>()

export function getOverlayCanvas(pass: ShaderPass, width: number, height: number): OverlayCanvas {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))

  let entry = overlayMap.get(pass)
  if (!entry) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    entry = { canvas, ctx, texture }
    overlayMap.set(pass, entry)
  } else if (entry.canvas.width !== w || entry.canvas.height !== h) {
    entry.canvas.width = w
    entry.canvas.height = h
  }
  return entry
}
