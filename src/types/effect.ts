// Core data model for effectshop.
// AppliedEffect / EffectParameter mirror the PRD's TypeScript spec exactly;
// everything else here is supporting scaffolding needed to make that spec runnable.

// 'seed' = an integer variation number with a "New variation" button.
// 'palette' = a comma-separated list of hex colors ("#aabbcc,#112233"),
// edited as a row of swatches -- kept as a plain string so it fits the
// existing number|string|boolean parameter value type everywhere else.
export type ParamType = 'slider' | 'select' | 'toggle' | 'color' | 'text' | 'seed' | 'palette'

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
  | 'Distort'
  | 'Overlay'
  // Playground generators (see effects/playground) -- shown in their own
  // sidebar tab rather than the main Effect Library.
  | 'Backgrounds'
  | 'Patterns'
  | 'Posters'
  | 'Textures'
  | 'Badges'

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
  // Absent (the default) = a normal single-pass GLSL effect: registered in
  // passes.ts's PASS_FACTORY with its own uniforms. 'overlay' = driven by a
  // CPU-side detect+draw step that needs the actual source media (not just
  // `tDiffuse`), registered instead in effects/overlayRegistry.ts -- no
  // PASS_FACTORY entry or EffectRenderer.tsx special-casing required, see
  // "Overlay-texture effects" in README for the full picture.
  kind?: 'overlay'
  // Present on Playground generators: their catalog number and a short
  // "makes" line, used by the Playground tab's numbered index.
  playground?: { no: number; makes: string }
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
