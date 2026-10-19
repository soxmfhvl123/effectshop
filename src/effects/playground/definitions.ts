import type { EffectDefinition, EffectParameter } from '../../types/effect'
import type { PlaygroundTool } from './types'

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
// (like a seed bar), then the tool's params, then Image / Animate / Dither /
// Grain / Blend, and the ink palette last.
export function toEffectDefinition(tool: PlaygroundTool): EffectDefinition {
  const shared: EffectParameter[] = []
  if (tool.imageReactive) {
    shared.push({ id: 'source', name: 'Image', type: 'slider', value: 0, min: 0, max: 1, step: 0.01 })
  }
  shared.push(
    { id: 'motion', name: 'Animate', type: 'slider', value: 0, min: 0, max: 2, step: 0.05 },
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
    playground: { no: tool.no, makes: tool.makes },
    parameters: [
      { id: 'seed', name: 'Variation', type: 'seed', value: defaultSeed(tool.no), min: 0, max: 9999, step: 1 },
      ...tool.params.map((p) => ({ ...p })),
      ...shared,
    ],
  }
}
