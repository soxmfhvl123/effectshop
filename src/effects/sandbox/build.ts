import * as THREE from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../../types/effect'
import { SB_KIT, SB_VERTEX } from './kit'
import { parsePalette } from './palettes'
import type { SandboxTool } from './types'

// One generic factory + uniform updater for all Sandbox tools, so adding a
// tool never touches passes.ts: its params map to `p_<id>` uniforms by
// convention, and the shared controls map to the kit's uniforms.
export const MAX_INKS = 8
const BLEND_INDEX: Record<string, number> = { Normal: 0, Multiply: 1, Screen: 2, Overlay: 3 }

const fragmentCache = new Map<string, string>()

function buildFragment(tool: SandboxTool): string {
  const cached = fragmentCache.get(tool.id)
  if (cached) return cached
  const decls = tool.params.map((p) => `uniform ${p.type === 'color' ? 'vec3' : 'float'} p_${p.id};`).join('\n')
  const source = `${SB_KIT}\n${decls}\n${tool.glsl}\nvoid main() { sbFinish(sbMain(sbCoord(), vUv)); }\n`
  fragmentCache.set(tool.id, source)
  return source
}

export function createSandboxPass(tool: SandboxTool): ShaderPass {
  const uniforms: Record<string, THREE.IUniform> = {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uSeed: { value: 0 },
    uSeedOff: { value: new THREE.Vector2() },
    uInks: { value: Array.from({ length: MAX_INKS }, () => new THREE.Color()) },
    uInkCount: { value: tool.inks.length },
    uSource: { value: 0 },
    uAnimate: { value: 1 },
    uMove: { value: 0 },
    uAmount: { value: 0.6 },
    uFps: { value: 12 },
    uLoop: { value: 36 },
    uDither: { value: 0 },
    uGrain: { value: 0 },
    uBlend: { value: 0 },
  }
  for (const p of tool.params) {
    uniforms[`p_${p.id}`] = { value: p.type === 'color' ? new THREE.Color(String(p.value)) : 0 }
  }
  return new ShaderPass({ uniforms, vertexShader: SB_VERTEX, fragmentShader: buildFragment(tool) })
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const frac = (x: number) => x - Math.floor(x)

export function updateSandboxUniforms(pass: ShaderPass, effect: AppliedEffect, tool: SandboxTool) {
  const u = pass.uniforms
  const params = effect.parameters

  const seed = num(params.seed, 0)
  u.uSeed.value = seed
  // Golden-ratio-ish offsets keep neighbouring seeds visually unrelated.
  u.uSeedOff.value.set(frac(seed * 0.754877666) * 173 + 11, frac(seed * 0.569840291) * 173 + 7)

  const inks = parsePalette(params.inks, tool.inks).slice(0, MAX_INKS)
  const colors = u.uInks.value as THREE.Color[]
  inks.forEach((hex, i) => colors[i].set(hex))
  u.uInkCount.value = inks.length

  u.uSource.value = num(params.source, 0)
  u.uAnimate.value = params.animate === false ? 0 : 1
  u.uMove.value = Math.max(0, tool.movements.indexOf(String(params.movement)))
  u.uAmount.value = num(params.amount, 0.6)
  u.uFps.value = Math.max(1, num(params.fps, 12))
  u.uLoop.value = Math.max(1, Math.round(num(params.loop, 36)))
  u.uDither.value = num(params.dither, tool.dither ?? 0)
  u.uGrain.value = num(params.grain, tool.grain ?? 0.12)
  u.uBlend.value = BLEND_INDEX[String(params.blend)] ?? 0

  for (const p of tool.params) {
    const uniform = u[`p_${p.id}`]
    const value = params[p.id] ?? p.value
    if (p.type === 'color') {
      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) (uniform.value as THREE.Color).set(value)
    } else if (p.type === 'toggle') {
      uniform.value = value ? 1 : 0
    } else if (p.type === 'select') {
      const index = p.options?.findIndex((o) => o.value === value) ?? 0
      uniform.value = Math.max(0, index)
    } else {
      uniform.value = num(value, Number(p.value))
    }
  }
}
