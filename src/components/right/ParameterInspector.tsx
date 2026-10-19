import { Plus, RefreshCw, Repeat, Shuffle, X } from 'lucide-react'
import { useEffectStore } from '../../store/useEffectStore'
import { getEffectDefinition } from '../../effects/registry'
import { parsePalette, rotatePalette, shufflePalette } from '../../effects/playground/palettes'
import { MAX_INKS } from '../../effects/playground/build'
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
    <div className="flex items-stretch gap-1.5" onDoubleClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={reroll}
        className="flex flex-1 items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2 text-left text-zinc-900 transition-colors hover:bg-white"
      >
        <RefreshCw size={14} />
        <span className="flex flex-col leading-tight">
          <span className="font-mono text-xs uppercase tracking-[0.18em]">New variation</span>
          <span className="font-mono text-[10px] text-zinc-500">Reshuffle every shape</span>
        </span>
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
        className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 text-center font-mono text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
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
    <div className="flex flex-col gap-2" onDoubleClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c, i) => (
          <div key={i} className="group relative">
            <input
              type="color"
              value={c}
              title={`Ink ${i + 1}`}
              onChange={(e) => save(colors.map((x, j) => (j === i ? e.target.value : x)), false)}
              className="h-8 w-8 cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 p-0.5"
            />
            {colors.length > 2 && (
              <button
                type="button"
                title="Remove ink"
                onClick={() => save(colors.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-zinc-900 group-hover:flex"
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
            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => save(shufflePalette(colors.length, colors))}
          className="flex items-center gap-1.5 rounded bg-zinc-900 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
        >
          <Shuffle size={12} /> New colors
        </button>
        <button
          type="button"
          onClick={() => save(rotatePalette(colors))}
          className="flex items-center gap-1.5 rounded bg-zinc-900 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
        >
          <Repeat size={12} /> Rotate
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
    <div className="flex flex-col gap-1" onDoubleClick={reset} title="Double-click to reset">
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-xs uppercase tracking-wide text-zinc-500">{param.name}</span>
        <div className="flex items-center gap-1">
          {param.type === 'slider' && (
            <input
              type="number"
              value={Number(value)}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(e) => updateParameter(effect.instanceId, param.id, Number(e.target.value))}
              className="w-20 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-right font-mono text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
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

      {param.type === 'select' && (
        <div className="flex flex-wrap gap-1">
          {param.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParameter(effect.instanceId, param.id, opt.value)}
              className={`rounded px-2.5 py-1 font-mono text-xs ${
                value === opt.value ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {param.type === 'toggle' && (
        <button
          type="button"
          onClick={() => updateParameter(effect.instanceId, param.id, !value)}
          className={`w-fit rounded px-2.5 py-1 font-mono text-xs uppercase tracking-wide ${
            value ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-500'
          }`}
        >
          {value ? 'On' : 'Off'}
        </button>
      )}

      {param.type === 'color' && (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => updateParameter(effect.instanceId, param.id, e.target.value)}
          className="h-7 w-14 rounded border border-zinc-800 bg-zinc-950"
        />
      )}

      {param.type === 'text' && (
        <input
          type="text"
          value={String(value)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateParameter(effect.instanceId, param.id, e.target.value)}
          className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
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
    <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800">
      <p className="shrink-0 px-3 pt-2.5 font-mono text-xs uppercase tracking-widest text-zinc-600">
        Parameters{def ? ` · ${def.name}` : ''}
      </p>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {!effect || !def ? (
          <p className="pt-4 text-center font-mono text-sm text-zinc-600">Select an effect in the pipeline.</p>
        ) : (
          def.parameters.map((param) => <ParamRow key={param.id} effect={effect} param={param} />)
        )}
      </div>
    </div>
  )
}
