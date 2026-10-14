import { useEffectStore } from '../../store/useEffectStore'
import { getEffectDefinition } from '../../effects/registry'
import { getEffectiveValue } from '../../lib/keyframes'
import type { AppliedEffect, EffectParameter } from '../../types/effect'
import { KeyframeToggleButton } from './KeyframeControls'

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
