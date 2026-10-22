import { Diamond } from 'lucide-react'
import { useEffectStore } from '../../store/useEffectStore'
import { findNearestKeyframe } from '../../lib/keyframes'
import type { Keyframe } from '../../types/effect'

// Stopwatch-style toggle: adds a keyframe at the playhead with the param's
// current value, or removes one already sitting at the playhead. Filled
// diamond = a keyframe exists at (or very near) the current time.
export function KeyframeToggleButton({
  instanceId,
  paramId,
  value,
  track,
}: {
  instanceId: string
  paramId: string
  value: number
  track: Keyframe[]
}) {
  const currentTime = useEffectStore((s) => s.currentTime)
  const toggleKeyframeAtCurrentTime = useEffectStore((s) => s.toggleKeyframeAtCurrentTime)
  const isOnKeyframe = !!findNearestKeyframe(track, currentTime)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggleKeyframeAtCurrentTime(instanceId, paramId, value)
      }}
      title={isOnKeyframe ? 'Remove keyframe at playhead' : 'Add keyframe at playhead'}
      className={`flex h-5 w-5 shrink-0 items-center justify-center hover:bg-tile ${
        isOnKeyframe ? 'text-amber-400' : track.length > 0 ? 'text-zinc-400' : 'text-zinc-600'
      }`}
    >
      <Diamond size={11} fill={isOnKeyframe ? 'currentColor' : 'none'} />
    </button>
  )
}
