import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffectStore } from '../../store/useEffectStore'
import { EffectCard } from './EffectCard'

export function ActivePipeline() {
  const activeEffects = useEffectStore((s) => s.activeEffects)
  const reorderEffects = useEffectStore((s) => s.reorderEffects)
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
    <div className="flex-1 overflow-y-auto p-2.5">
      <p className="mb-2 px-0.5 font-mono text-xs uppercase tracking-widest text-zinc-600">
        Active Pipeline · {activeEffects.length}
      </p>
      {activeEffects.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-800 px-3 py-6 text-center font-mono text-sm leading-relaxed text-zinc-600">
          Add an effect from the Library to build your pipeline. Effects render top → bottom.
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
