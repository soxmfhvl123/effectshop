import { isSandboxEffect } from '../effects/sandbox'
import type { AppliedEffect, SceneClip, SceneTransition } from '../types/effect'

// Sequence mode: the enabled Sandbox tools in the pipeline stop stacking and
// play one after another as scenes, each handing over to the next with a
// transition. The last scene hands back to the first, so the whole sequence
// is one seamless loop. Every other effect keeps applying on top of
// whichever scenes are showing, like a filter over the whole film.

export const DEFAULT_CLIP: SceneClip = { duration: 3, transition: 'fade' }

export const SCENE_TRANSITIONS: { value: SceneTransition; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'wipe', label: 'Wipe' },
  { value: 'iris', label: 'Iris' },
  { value: 'flash', label: 'Flash' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'slide', label: 'Slide' },
  { value: 'cut', label: 'Cut' },
]

// Index into the kit's uTrans uniform (0 = no transition, fully shown).
export const TRANSITION_INDEX: Record<SceneTransition, number> = {
  fade: 1,
  wipe: 2,
  iris: 3,
  flash: 4,
  dissolve: 5,
  slide: 6,
  cut: 0,
}

export function isSceneEffect(effect: AppliedEffect): boolean {
  return effect.enabled && isSandboxEffect(effect.effectId)
}

export function clipOf(effect: AppliedEffect): SceneClip {
  return effect.clip ?? DEFAULT_CLIP
}

export interface SceneSlot {
  instanceId: string
  name: string
  start: number
  end: number
  transition: SceneTransition
  // seconds at the end of this scene spent handing over to the next
  overlap: number
}

export interface SequenceLayout {
  scenes: SceneSlot[]
  total: number
}

export function sequenceLayout(effects: AppliedEffect[], transitionSeconds: number): SequenceLayout {
  const scenes: SceneSlot[] = []
  let t = 0
  for (const e of effects) {
    if (!isSceneEffect(e)) continue
    const clip = clipOf(e)
    const duration = Math.max(0.5, clip.duration)
    scenes.push({ instanceId: e.instanceId, name: e.name, start: t, end: t + duration, transition: clip.transition, overlap: 0 })
    t += duration
  }
  // A hand-over can't eat more than half of either scene it joins.
  if (scenes.length > 1) {
    scenes.forEach((s, i) => {
      const next = scenes[(i + 1) % scenes.length]
      const room = Math.min(s.end - s.start, next.end - next.start) * 0.5
      s.overlap = s.transition === 'cut' ? 0 : Math.min(Math.max(0, transitionSeconds), room)
    })
  }
  return { scenes, total: t }
}

export interface SceneState {
  instanceId: string
  // 'main' is the scene that owns this moment; 'incoming' is the next one
  // being revealed over it during a hand-over.
  role: 'main' | 'incoming'
  transition: SceneTransition
  progress: number // 0..1, incoming only
  // seconds since this scene first appeared -- its own clock, so each scene's
  // animation starts fresh and the clock runs on unbroken across the loop
  localTime: number
}

export function sceneStatesAt(layout: SequenceLayout, time: number): SceneState[] {
  const { scenes, total } = layout
  if (scenes.length === 0 || total <= 0) return []
  const t = ((time % total) + total) % total
  if (scenes.length === 1) return [{ instanceId: scenes[0].instanceId, role: 'main', transition: 'cut', progress: 0, localTime: t }]

  const i = Math.max(0, scenes.findIndex((s) => t >= s.start && t < s.end))
  const cur = scenes[i]
  const prev = scenes[(i - 1 + scenes.length) % scenes.length]
  const out: SceneState[] = [
    // the time it spent fading in under the previous scene counts toward its clock
    { instanceId: cur.instanceId, role: 'main', transition: 'cut', progress: 0, localTime: t - cur.start + prev.overlap },
  ]
  const handoverStart = cur.end - cur.overlap
  if (cur.overlap > 0 && t >= handoverStart) {
    const next = scenes[(i + 1) % scenes.length]
    const into = t - handoverStart
    out.push({ instanceId: next.instanceId, role: 'incoming', transition: cur.transition, progress: into / cur.overlap, localTime: into })
  }
  return out
}
