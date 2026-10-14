// Core data model for effectshop.
// AppliedEffect / EffectParameter mirror the PRD's TypeScript spec exactly;
// everything else here is supporting scaffolding needed to make that spec runnable.

export type ParamType = 'slider' | 'select' | 'toggle' | 'color' | 'text'

export interface EffectParameter {
  id: string
  name: string
  type: ParamType
  value: number | string | boolean
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
}

export type EffectCategory =
  | 'Print & Texture'
  | 'Retro Display'
  | 'Glitch'
  | 'Lens/Blur'
  | 'Color/Tone'
  | 'Generate'

export interface Keyframe {
  time: number // seconds, video timeline position
  value: number
}

export interface AppliedEffect {
  instanceId: string
  effectId: string // e.g. 'halftone', 'crt', 'dither'
  name: string
  enabled: boolean
  opacity: number // 0 ~ 1
  parameters: Record<string, number | string | boolean>
  // Optional per-parameter animation tracks, keyed by parameter id (plus the
  // reserved key 'opacity' for the opacity track). Only meaningful for
  // numeric (slider) values and only used in video mode; a param with no
  // entry here (or an empty array) just uses its static value.
  keyframes?: Record<string, Keyframe[]>
}

// Static catalog entry for an effect available in the Left Sidebar library.
// `implemented: false` effects render in the library (so the full catalog from
// the PRD is visible) but are disabled/"Soon"-badged until their GLSL pass ships.
export interface EffectDefinition {
  id: string
  name: string
  category: EffectCategory
  description: string
  implemented: boolean
  parameters: EffectParameter[]
}

export interface Preset {
  id: string
  name: string
  description: string
  implemented: boolean
  effects: Omit<AppliedEffect, 'instanceId'>[]
}

export type ZoomMode = 'fit' | '100' | 'custom'

export type MediaType = 'image' | 'video'
