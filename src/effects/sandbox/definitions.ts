import type { EffectDefinition, EffectParameter } from '../../types/effect'
import type { SandboxTool } from './types'

export const BLEND_OPTIONS = [
  { label: 'Normal', value: 'Normal' },
  { label: 'Multiply', value: 'Multiply' },
  { label: 'Screen', value: 'Screen' },
  { label: 'Overlay', value: 'Overlay' },
]

export function defaultSeed(no: number): number {
  return (no * 7919 + 1301) % 10000
}

// Every tool gets the same shared controls around its own: Variation first
// (like a seed bar), then the tool's params, then Image, the motion group
// (Animate / Movement / Amount / Speed / Loop), Dither / Grain / Blend, and
// the ink palette last.
export function toEffectDefinition(tool: SandboxTool): EffectDefinition {
  const shared: EffectParameter[] = []
  if (tool.imageReactive) {
    shared.push({ id: 'source', name: 'Image', type: 'slider', value: 0, min: 0, max: 1, step: 0.01 })
  }
  shared.push(
    { id: 'animate', name: 'Animate', type: 'toggle', value: true },
    {
      id: 'movement',
      name: 'Movement',
      type: 'select',
      value: tool.movements[0],
      options: tool.movements.map((m) => ({ label: m, value: m })),
    },
    { id: 'amount', name: 'Amount', type: 'slider', value: 0.6, min: 0, max: 1, step: 0.01 },
    { id: 'fps', name: 'Speed · fps', type: 'slider', value: 12, min: 1, max: 60, step: 1 },
    { id: 'loop', name: 'Loop · frames', type: 'slider', value: 36, min: 6, max: 240, step: 1 },
    { id: 'dither', name: 'Dither', type: 'slider', value: tool.dither ?? 0, min: 0, max: 1, step: 0.01 },
    { id: 'grain', name: 'Grain', type: 'slider', value: tool.grain ?? 0.12, min: 0, max: 1, step: 0.01 },
    { id: 'blend', name: 'Blend', type: 'select', value: 'Normal', options: BLEND_OPTIONS },
    { id: 'inks', name: 'Inks', type: 'palette', value: tool.inks.join(',') },
  )

  return {
    id: tool.id,
    name: tool.name,
    category: tool.kind,
    description: tool.makes,
    implemented: true,
    sandbox: { no: tool.no, makes: tool.makes },
    parameters: [
      { id: 'seed', name: 'Variation', type: 'seed', value: defaultSeed(tool.no), min: 0, max: 9999, step: 1 },
      ...tool.params.map((p) => ({ ...p })),
      ...shared,
    ],
  }
}
