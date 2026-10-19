import { BACKGROUNDS } from './backgrounds'
import { toEffectDefinition } from './definitions'
import { PATTERNS } from './patterns'
import { POSTERS } from './posters'
import { TEXTURES } from './textures'
import type { PlaygroundKind, PlaygroundTool } from './types'

// Sorted by catalog number so the Playground tab's index reads 01 → 52.
export const PLAYGROUND_TOOLS: PlaygroundTool[] = [...BACKGROUNDS, ...PATTERNS, ...POSTERS, ...TEXTURES].sort((a, b) => a.no - b.no)

export const PLAYGROUND_MAP: Record<string, PlaygroundTool> = Object.fromEntries(PLAYGROUND_TOOLS.map((t) => [t.id, t]))

export const PLAYGROUND_DEFINITIONS = PLAYGROUND_TOOLS.map(toEffectDefinition)

export const PLAYGROUND_KINDS: PlaygroundKind[] = ['Backgrounds', 'Patterns', 'Posters', 'Textures', 'Badges']

export function isPlaygroundEffect(effectId: string): boolean {
  return effectId in PLAYGROUND_MAP
}
