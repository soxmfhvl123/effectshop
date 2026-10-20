import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Clapperboard } from 'lucide-react'
import { createBlankImage } from '../../lib/media'
import { isSceneEffect } from '../../lib/sequence'
import { useEffectStore } from '../../store/useEffectStore'
import { EffectCard } from './EffectCard'

export function ActivePipeline() {
  const activeEffects = useEffectStore((s) => s.activeEffects)
  const reorderEffects = useEffectStore((s) => s.reorderEffects)
  const sequenceMode = useEffectStore((s) => s.sequenceMode)
  const setSequenceMode = useEffectStore((s) => s.setSequenceMode)
  const sequenceTransition = useEffectStore((s) => s.sequenceTransition)
  const setSequenceTransition = useEffectStore((s) => s.setSequenceTransition)
  const mediaType = useEffectStore((s) => s.mediaType)
  const setSourceImage = useEffectStore((s) => s.setSourceImage)
  const setPlaying = useEffectStore((s) => s.setPlaying)
  const sceneCount = activeEffects.filter(isSceneEffect).length

  // Sequences are films: with nothing loaded, start on a blank 16:9 frame,
  // and start playing so the hand-overs are visible straight away.
  const toggleSequence = async () => {
    const on = !sequenceMode
    if (on && mediaType === null) setSourceImage(await createBlankImage('16:9'))
    setSequenceMode(on)
    setPlaying(on)
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeEffects.findIndex((e) => e.instanceId === active.id)
    const newIndex = activeEffects.findIndex((e) => e.instanceId === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    reorderEffects(oldIndex, newIndex)
  }

  return (
    <div className="max-h-64 shrink-0 overflow-y-auto p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">Active Pipeline · {activeEffects.length}</p>
        <button
          type="button"
          onClick={toggleSequence}
          title="Play the Sandbox tools one after another as scenes, with transitions"
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
            sequenceMode ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
          }`}
        >
          <Clapperboard size={12} /> Sequence
        </button>
      </div>
      {sequenceMode && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span>
            {sceneCount === 0 ? 'Add Sandbox tools to make scenes' : `${sceneCount} scene${sceneCount === 1 ? '' : 's'} · top → bottom · loops`}
          </span>
          <label className="flex items-center gap-1" title="How long each hand-over between scenes takes">
            Transition
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={sequenceTransition}
              onChange={(e) => setSequenceTransition(Number(e.target.value))}
              className="w-12 rounded border border-zinc-800 bg-zinc-950 px-1 py-0.5 text-right text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
            s
          </label>
        </div>
      )}
      {activeEffects.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-800 px-3 py-6 text-center font-mono text-sm leading-relaxed text-zinc-600">
          {sequenceMode
            ? 'Add Sandbox tools — each one becomes a scene, played top → bottom.'
            : 'Add an effect from the Library to build your pipeline. Effects render top → bottom.'}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeEffects.map((e) => e.instanceId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {activeEffects.map((effect) => (
                <EffectCard key={effect.instanceId} effect={effect} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
