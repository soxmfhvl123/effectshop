import type { EffectCategory } from '../../types/effect'

export type SandboxKind = Extract<EffectCategory, 'Grounds' | 'Repeats' | 'Prints' | 'Surfaces' | 'Emblems'>

// A tool-specific control. Each becomes a uniform named `p_<id>` in the
// tool's GLSL: float for slider/toggle (0/1)/select (option index), vec3 for
// color.
export interface SandboxParam {
  id: string
  name: string
  type: 'slider' | 'toggle' | 'select' | 'color'
  value: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
}

export interface SandboxTool {
  id: string
  no: number
  name: string
  makes: string
  kind: SandboxKind
  params: SandboxParam[]
  inks: string[]
  // The tool's own ways of moving, in the order its GLSL reads them: the
  // chosen one's index is `uMove`, and `sbMv(i)` is movement i's strength.
  movements: string[]
  // Adds the shared "Image" slider -- only for tools whose GLSL actually
  // reads the photo (via sbField / sbSrc / uSource), so it never shows up
  // as a control that does nothing.
  imageReactive?: boolean
  dither?: number
  grain?: number
  // Body defining `vec3 sbMain(vec2 p, vec2 uv)`, plus any helpers it needs.
  glsl: string
}
