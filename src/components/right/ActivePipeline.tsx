import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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
    <div className="max-h-72 shrink-0 overflow-y-auto px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="k-label">
          PIPELINE<sup className="ml-0.5 text-[0.6em]">{activeEffects.length}</sup>
        </h2>
        <button
          type="button"
          onClick={toggleSequence}
          title="Play the Sandbox tools one after another as scenes, with transitions"
          className={`k-btn py-1 ${sequenceMode ? 'is-active' : ''}`}
        >
          SEQUENCE {sequenceMode ? 'ON' : 'OFF'}
        </button>
      </div>
      {sequenceMode && (
        <div className="k-meta mb-3 flex items-center justify-between gap-2 border-y border-hairline py-1.5 text-dim">
          <span>
            {sceneCount === 0 ? 'Add Sandbox tools to make scenes' : `${sceneCount} scene${sceneCount === 1 ? '' : 's'} · top to bottom · loops`}
          </span>
          <label className="flex items-center gap-1.5" title="How long each hand-over between scenes takes">
            Transition
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={sequenceTransition}
              onChange={(e) => setSequenceTransition(Number(e.target.value))}
              className="k-input w-12 py-0.5 text-right"
            />
            s
          </label>
        </div>
      )}
      {activeEffects.length === 0 ? (
        <p className="k-meta border border-dashed border-hairline px-3 py-6 text-center text-dim">
          {sequenceMode
            ? 'Add Sandbox tools — each one becomes a scene, played top → bottom.'
            : 'Add an effect from the Library to build your pipeline. Effects render top → bottom.'}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeEffects.map((e) => e.instanceId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
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
