import { toEffectDefinition } from './definitions'
import { GROUNDS } from './grounds'
import { PRINTS } from './prints'
import { REPEATS } from './repeats'
import { SURFACES } from './surfaces'
import type { SandboxKind, SandboxTool } from './types'

// Sorted by catalog number so the Sandbox tab's index reads 01 → 52.
export const SANDBOX_TOOLS: SandboxTool[] = [...GROUNDS, ...REPEATS, ...PRINTS, ...SURFACES].sort((a, b) => a.no - b.no)

export const SANDBOX_MAP: Record<string, SandboxTool> = Object.fromEntries(SANDBOX_TOOLS.map((t) => [t.id, t]))

export const SANDBOX_DEFINITIONS = SANDBOX_TOOLS.map(toEffectDefinition)

export const SANDBOX_KINDS: SandboxKind[] = ['Grounds', 'Repeats', 'Prints', 'Surfaces', 'Emblems']

export function isSandboxEffect(effectId: string): boolean {
  return effectId in SANDBOX_MAP
}
