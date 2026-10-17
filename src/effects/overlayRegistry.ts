import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { AppliedEffect } from '../types/effect'
import { updateBlobTrackingOverlay } from './blobTrackingOverlay'

// The generic hook for `kind: 'overlay'` effects (see the `kind` field's
// comment in types/effect.ts): any effect whose live preview needs the
// actual source media (not just the previous pass's pixels) registers its
// update function here instead of getting hardcoded into EffectRenderer.tsx
// and a dedicated PASS_FACTORY entry. `throttled: true` means the engine
// only calls it on the shared ~150ms detection cadence (for a CPU detect
// step); omit it for an effect that needs to run every frame instead (a
// particle sim, a decaying trail).
export type OverlayUpdateFn = (pass: ShaderPass, effect: AppliedEffect, source: CanvasImageSource, resolution: THREE.Vector2) => void

export interface OverlayEffectEntry {
  update: OverlayUpdateFn
  throttled?: boolean
}

// Blob Tracker, Text, Motion Glow, Firefly Swarm and Echo Trail predate this
// hook and still use their own hand-written special cases in
// EffectRenderer.tsx/passes.ts (see README's "Overlay-texture effects") --
// they're intentionally left as-is rather than migrated, since they already
// work and migrating five shipped effects for symmetry alone isn't worth
// the regression risk. Register any *new* overlay-kind effect here instead.
export const OVERLAY_UPDATERS: Record<string, OverlayEffectEntry> = {
  blobTracking: { update: updateBlobTrackingOverlay, throttled: true },
}
