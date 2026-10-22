import { Plus, X } from 'lucide-react'
import { useEffectStore } from '../../store/useEffectStore'
import { getEffectDefinition } from '../../effects/registry'
import { parsePalette, rotatePalette, shufflePalette } from '../../effects/sandbox/palettes'
import { MAX_INKS } from '../../effects/sandbox/build'
import { getEffectiveValue } from '../../lib/keyframes'
import type { AppliedEffect, EffectParameter } from '../../types/effect'
import { KeyframeToggleButton } from './KeyframeControls'

function SeedControl({ effect, param }: { effect: AppliedEffect; param: EffectParameter }) {
  const commitParameter = useEffectStore((s) => s.commitParameter)
  const updateParameter = useEffectStore((s) => s.updateParameter)
  const value = Number(effect.parameters[param.id] ?? param.value)
  const max = param.max ?? 9999
  const reroll = () => {
    let next = Math.floor(Math.random() * (max + 1))
    if (next === value) next = (next + 1) % (max + 1)
    commitParameter(effect.instanceId, param.id, next)
  }

  return (
    // Rapid clicks on "New variation" shouldn't count as the row's
    // double-click-to-reset.
    <div className="flex items-stretch gap-2" onDoubleClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={reroll} title="Reshuffle every shape" className="k-btn flex-1 justify-start py-2">
        ↻ NEW VARIATION
      </button>
      <input
        type="number"
        value={value}
        min={param.min ?? 0}
        max={max}
        step={1}
        title="Variation number"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => updateParameter(effect.instanceId, param.id, Math.round(Number(e.target.value)) || 0)}
        className="k-input w-16 text-center"
      />
    </div>
  )
}

function PaletteControl({ effect, param }: { effect: AppliedEffect; param: EffectParameter }) {
  const commitParameter = useEffectStore((s) => s.commitParameter)
  const updateParameter = useEffectStore((s) => s.updateParameter)
  const colors = parsePalette(effect.parameters[param.id], parsePalette(param.value, ['#000000', '#ffffff']))
  const save = (next: string[], commit = true) =>
    (commit ? commitParameter : updateParameter)(effect.instanceId, param.id, next.join(','))

  return (
    <div className="flex flex-col gap-2.5" onDoubleClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c, i) => (
          <div key={i} className="group relative">
            <input
              type="color"
              value={c}
              title={`Ink ${i + 1}`}
              onChange={(e) => save(colors.map((x, j) => (j === i ? e.target.value : x)), false)}
              className="h-7 w-7 cursor-pointer border border-hairline bg-transparent p-0.5"
            />
            {colors.length > 2 && (
              <button
                type="button"
                title="Remove ink"
                onClick={() => save(colors.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center bg-ink text-paper group-hover:flex"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        {colors.length < MAX_INKS && (
          <button
            type="button"
            title="Add ink"
            onClick={() => save([...colors, colors[colors.length - 1]])}
            className="flex h-7 w-7 items-center justify-center border border-dashed border-hairline text-dim hover:border-dim hover:text-ink"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => save(shufflePalette(colors.length, colors))} className="k-btn">
          NEW COLORS
        </button>
        <button type="button" onClick={() => save(rotatePalette(colors))} className="k-btn">
          ROTATE
        </button>
      </div>
    </div>
  )
}

function ParamRow({ effect, param }: { effect: AppliedEffect; param: EffectParameter }) {
  const updateParameter = useEffectStore((s) => s.updateParameter)
  const resetParameter = useEffectStore((s) => s.resetParameter)
  const duration = useEffectStore((s) => s.duration)
  const currentTime = useEffectStore((s) => s.currentTime)
  const reset = () => resetParameter(effect.instanceId, param.id)

  const rawValue = effect.parameters[param.id]
  const track = effect.keyframes?.[param.id] ?? []
  // Video always has a real duration; images get a synthetic one once
  // loaded (see DEFAULT_IMAGE_DURATION) — either way, a timeline to
  // keyframe against exists whenever duration > 0.
  const canKeyframe = duration > 0 && param.type === 'slider'
  const value = param.type === 'slider' ? getEffectiveValue(effect, param.id, currentTime, Number(rawValue)) : rawValue

  return (
    <div className="flex flex-col gap-1.5" onDoubleClick={reset} title="Double-click to reset">
      {/* a meta row: the field's name dim, its value in ink */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="k-meta text-dim">{param.name}</span>
        <div className="flex items-center gap-1">
          {param.type === 'slider' && (
            <input
              type="number"
              value={Number(value)}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(e) => updateParameter(effect.instanceId, param.id, Number(e.target.value))}
              className="k-input w-[4.5rem] text-right"
            />
          )}
          {canKeyframe && (
            <KeyframeToggleButton instanceId={effect.instanceId} paramId={param.id} value={Number(value)} track={track} />
          )}
        </div>
      </div>

      {param.type === 'seed' && <SeedControl effect={effect} param={param} />}
      {param.type === 'palette' && <PaletteControl effect={effect} param={param} />}

      {param.type === 'slider' && (
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={Number(value)}
          onChange={(e) => updateParameter(effect.instanceId, param.id, Number(e.target.value))}
        />
      )}

      {/* choices read as a Kinda filter row: the picked one in ink, underlined */}
      {param.type === 'select' && (
        <div className="flex flex-wrap gap-x-[14px] gap-y-1.5">
          {param.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParameter(effect.instanceId, param.id, opt.value)}
              className={`k-filter ${value === opt.value ? 'is-active' : ''}`}
            >
              {opt.label.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {param.type === 'toggle' && (
        <div className="flex gap-[14px]">
          {[true, false].map((on) => (
            <button
              key={String(on)}
              type="button"
              onClick={() => updateParameter(effect.instanceId, param.id, on)}
              className={`k-filter ${Boolean(value) === on ? 'is-active' : ''}`}
            >
              {on ? 'ON' : 'OFF'}
            </button>
          ))}
        </div>
      )}

      {param.type === 'color' && (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => updateParameter(effect.instanceId, param.id, e.target.value)}
          className="h-7 w-14 border border-hairline bg-transparent p-0.5"
        />
      )}

      {param.type === 'text' && (
        <input
          type="text"
          value={String(value)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateParameter(effect.instanceId, param.id, e.target.value)}
          className="k-input w-full"
        />
      )}
    </div>
  )
}

export function ParameterInspector() {
  const selectedInstanceId = useEffectStore((s) => s.selectedInstanceId)
  const activeEffects = useEffectStore((s) => s.activeEffects)
  const effect = activeEffects.find((e) => e.instanceId === selectedInstanceId)
  const def = effect ? getEffectDefinition(effect.effectId) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-hairline">
      <h2 className="k-label shrink-0 px-5 pt-4">PARAMETERS{def ? ` · ${def.name.toUpperCase()}` : ''}</h2>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!effect || !def ? (
          <p className="k-meta pt-4 text-center text-dim">Select an effect in the pipeline.</p>
        ) : (
          def.parameters.map((param) => <ParamRow key={param.id} effect={effect} param={param} />)
        )}
      </div>
    </div>
  )
}
