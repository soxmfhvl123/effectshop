import type { AppliedEffect, Keyframe } from '../types/effect'

// How close (in seconds) a click/scrub has to be to an existing keyframe to
// be treated as "on" it (for the toggle button and for upsert-on-drag).
const NEAREST_EPSILON = 0.05

export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time)
}

export function findNearestKeyframe(keyframes: Keyframe[], time: number, epsilon = NEAREST_EPSILON) {
  return keyframes.find((k) => Math.abs(k.time - time) <= epsilon)
}

// Inserts a keyframe at `time`, or overwrites the value of an existing one
// within NEAREST_EPSILON of `time` (so dragging a param at the same playhead
// position updates rather than piling up near-duplicate keyframes).
export function upsertKeyframe(keyframes: Keyframe[], time: number, value: number): Keyframe[] {
  const existing = findNearestKeyframe(keyframes, time)
  const next = existing
    ? keyframes.map((k) => (k === existing ? { time: k.time, value } : k))
    : [...keyframes, { time, value }]
  return sortKeyframes(next)
}

export function removeKeyframeAt(keyframes: Keyframe[], time: number): Keyframe[] {
  return keyframes.filter((k) => Math.abs(k.time - time) > 0.001)
}

// Piecewise-linear interpolation; holds the first/last value outside the
// track's time range.
export function interpolateKeyframes(keyframes: Keyframe[], time: number): number {
  if (keyframes.length === 0) return 0
  const sorted = sortKeyframes(keyframes)
  if (time <= sorted[0].time) return sorted[0].value
  const last = sorted[sorted.length - 1]
  if (time >= last.time) return last.value
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (time >= a.time && time <= b.time) {
      const t = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time)
      return a.value + (b.value - a.value) * t
    }
  }
  return last.value
}

// Resolves a single track's animated value at `time`, falling back to
// `fallback` (the static value) when there's no track or it's empty.
export function getEffectiveValue(effect: AppliedEffect, paramId: string, time: number, fallback: number): number {
  const track = effect.keyframes?.[paramId]
  if (!track || track.length === 0) return fallback
  return interpolateKeyframes(track, time)
}

// Returns a copy of `effect` with opacity + every keyframed numeric
// parameter resolved against their tracks at `time`. Cheap no-op (returns
// the same reference) when the effect has no keyframe tracks at all.
export function evaluateEffectAtTime(effect: AppliedEffect, time: number): AppliedEffect {
  if (!effect.keyframes || Object.keys(effect.keyframes).length === 0) return effect

  const opacity = getEffectiveValue(effect, 'opacity', time, effect.opacity)
  const parameters = { ...effect.parameters }
  for (const paramId of Object.keys(effect.keyframes)) {
    if (paramId === 'opacity') continue
    const base = effect.parameters[paramId]
    if (typeof base === 'number') {
      parameters[paramId] = getEffectiveValue(effect, paramId, time, base)
    }
  }
  return { ...effect, opacity, parameters }
}
