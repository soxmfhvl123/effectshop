import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react'
import { useEffectStore } from '../../store/useEffectStore'
import { getEffectiveValue } from '../../lib/keyframes'
import type { AppliedEffect } from '../../types/effect'
import { KeyframeToggleButton } from './KeyframeControls'

export function EffectCard({ effect }: { effect: AppliedEffect }) {
  const selectedInstanceId = useEffectStore((s) => s.selectedInstanceId)
  const selectInstance = useEffectStore((s) => s.selectInstance)
  const toggleEffect = useEffectStore((s) => s.toggleEffect)
  const removeEffect = useEffectStore((s) => s.removeEffect)
  const setEffectOpacity = useEffectStore((s) => s.setEffectOpacity)
  const duration = useEffectStore((s) => s.duration)
  const currentTime = useEffectStore((s) => s.currentTime)
  const opacityTrack = effect.keyframes?.opacity ?? []
  const displayedOpacity = getEffectiveValue(effect, 'opacity', currentTime, effect.opacity)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: effect.instanceId,
  })

  const isSelected = selectedInstanceId === effect.instanceId

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => selectInstance(effect.instanceId)}
      className={`rounded border bg-zinc-950 px-2 py-2 transition-colors ${
        isSelected ? 'border-zinc-500' : 'border-zinc-800 hover:border-zinc-700'
      } ${isDragging ? 'z-10 opacity-70' : ''} ${!effect.enabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-zinc-600 hover:text-zinc-300 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex-1 truncate font-mono text-sm font-medium text-zinc-100">{effect.name}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleEffect(effect.instanceId)
          }}
          className="text-zinc-500 hover:text-zinc-200"
          title={effect.enabled ? 'Hide' : 'Show'}
        >
          {effect.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            removeEffect(effect.instanceId)
          }}
          className="text-zinc-500 hover:text-red-400"
          title="Remove"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2 pl-[22px]">
        <span className="w-12 font-mono text-[10px] uppercase tracking-wide text-zinc-600">Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={displayedOpacity}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setEffectOpacity(effect.instanceId, Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-8 text-right font-mono text-xs text-zinc-500">{Math.round(displayedOpacity * 100)}</span>
        {duration > 0 && (
          <KeyframeToggleButton instanceId={effect.instanceId} paramId="opacity" value={displayedOpacity} track={opacityTrack} />
        )}
      </div>
    </div>
  )
}
