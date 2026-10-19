import type { EffectCategory } from '../../types/effect'

export type PlaygroundKind = Extract<EffectCategory, 'Backgrounds' | 'Patterns' | 'Posters' | 'Textures' | 'Badges'>

// A tool-specific control. Each becomes a uniform named `p_<id>` in the
// tool's GLSL: float for slider/toggle (0/1)/select (option index), vec3 for
// color.
export interface PlaygroundParam {
  id: string
  name: string
  type: 'slider' | 'toggle' | 'select' | 'color'
  value: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
}

export interface PlaygroundTool {
  id: string
  no: number
  name: string
  makes: string
  kind: PlaygroundKind
  params: PlaygroundParam[]
  inks: string[]
  // Adds the shared "Image" slider -- only for tools whose GLSL actually
  // reads the photo (via pgField / pgSrc / uSource), so it never shows up
  // as a control that does nothing.
  imageReactive?: boolean
  dither?: number
  grain?: number
  // Body defining `vec3 pgMain(vec2 p, vec2 uv)`, plus any helpers it needs.
  glsl: string
}
