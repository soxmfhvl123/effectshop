import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useEffectStore } from '../../store/useEffectStore'
import { getEffectDefinition } from '../../effects/registry'
import { SCENE_TRANSITIONS, sequenceLayout } from '../../lib/sequence'
import type { Keyframe } from '../../types/effect'

interface Track {
  instanceId: string
  paramId: string
  effectName: string
  paramLabel: string
  keyframes: Keyframe[]
  color: string
}

const TRACK_COLORS = ['#22d3ee', '#f472b6', '#facc15', '#4ade80', '#a78bfa', '#fb923c', '#60a5fa', '#f87171']
const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

function pickTickStep(duration: number): number {
  for (const step of TICK_STEPS) {
    if (duration / step <= 8) return step
  }
  return TICK_STEPS[TICK_STEPS.length - 1]
}

function formatTime(seconds: number, tickStep: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const sStr = tickStep < 1 ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0')
  return `${m}:${sStr}`
}

// Unified bottom timeline: one row per (effect, parameter) pair that
// currently has a keyframe track, a time ruler, and a playhead shared across
// both — the video-editor-style complement to the per-parameter stopwatch
// toggle buttons in ParameterInspector/EffectCard, which stay as the quick
// "start animating this" entry point. This panel is where you see the whole
// animation at once and scrub/delete keyframes.
export function Timeline() {
  const duration = useEffectStore((s) => s.duration)
  const currentTime = useEffectStore((s) => s.currentTime)
  const activeEffects = useEffectStore((s) => s.activeEffects)
  const seek = useEffectStore((s) => s.seek)
  const removeKeyframe = useEffectStore((s) => s.removeKeyframe)
  const selectedInstanceId = useEffectStore((s) => s.selectedInstanceId)
  const selectInstance = useEffectStore((s) => s.selectInstance)
  const sequenceMode = useEffectStore((s) => s.sequenceMode)
  const sequenceTransition = useEffectStore((s) => s.sequenceTransition)
  const layout = useMemo(() => sequenceLayout(activeEffects, sequenceTransition), [activeEffects, sequenceTransition])

  const scrubAreaRef = useRef<HTMLDivElement>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const tracks = useMemo<Track[]>(() => {
    const result: Track[] = []
    let colorIdx = 0
    for (const effect of activeEffects) {
      if (!effect.keyframes) continue
      const def = getEffectDefinition(effect.effectId)
      for (const [paramId, kfs] of Object.entries(effect.keyframes)) {
        if (!kfs || kfs.length === 0) continue
        const paramLabel = paramId === 'opacity' ? 'Opacity' : (def?.parameters.find((p) => p.id === paramId)?.name ?? paramId)
        result.push({
          instanceId: effect.instanceId,
          paramId,
          effectName: effect.name,
          paramLabel,
          keyframes: kfs,
          color: TRACK_COLORS[colorIdx++ % TRACK_COLORS.length],
        })
      }
    }
    return result
  }, [activeEffects])

  if (duration <= 0) return null

  const pct = (t: number) => `${duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0}%`

  const seekFromClientX = (clientX: number) => {
    const el = scrubAreaRef.current
    if (!el || duration <= 0) return
    const rect = el.getBoundingClientRect()
    const t = ((clientX - rect.left) / rect.width) * duration
    seek(Math.min(duration, Math.max(0, t)))
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsScrubbing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromClientX(e.clientX)
  }
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    seekFromClientX(e.clientX)
  }
  const handlePointerUp = () => setIsScrubbing(false)

  const tickStep = pickTickStep(duration || 1)
  const ticks: number[] = []
  for (let t = 0; t <= duration + 0.001; t += tickStep) ticks.push(t)

  return (
    <div className="flex max-h-56 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="relative" ref={scrubAreaRef}>
        <div
          className="relative h-6 shrink-0 cursor-pointer select-none border-b border-zinc-800"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 h-full" style={{ left: pct(t) }}>
              <div className="h-1.5 w-px bg-zinc-700" />
              <span className="absolute top-2 left-1 whitespace-nowrap font-mono text-[10px] text-zinc-600">
                {formatTime(t, tickStep)}
              </span>
            </div>
          ))}
        </div>

        {sequenceMode && layout.scenes.length > 0 && (
          <div className="relative h-8 border-b border-zinc-800">
            {layout.scenes.map((sc, i) => (
              <button
                key={sc.instanceId}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  selectInstance(sc.instanceId)
                  seek(sc.start)
                }}
                title={`${sc.name} · ${(sc.end - sc.start).toFixed(1)}s`}
                className={`absolute top-1 bottom-1 overflow-hidden rounded-sm border px-1.5 text-left font-mono text-[10px] uppercase tracking-wider ${
                  selectedInstanceId === sc.instanceId ? 'border-zinc-200 text-zinc-100' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
                style={{ left: pct(sc.start), width: pct(sc.end - sc.start), backgroundColor: `${TRACK_COLORS[i % TRACK_COLORS.length]}22` }}
              >
                <span className="truncate">
                  {String(i + 1).padStart(2, '0')} {sc.name}
                </span>
              </button>
            ))}
            {layout.scenes.map(
              (sc) =>
                sc.overlap > 0 && (
                  <div
                    key={`${sc.instanceId}-t`}
                    title={`${SCENE_TRANSITIONS.find((t) => t.value === sc.transition)?.label ?? ''} · ${sc.overlap.toFixed(1)}s`}
                    className="pointer-events-none absolute top-0 bottom-0 bg-gradient-to-r from-transparent to-white/25"
                    style={{ left: pct(sc.end - sc.overlap), width: pct(sc.overlap) }}
                  />
                ),
            )}
          </div>
        )}

        <div className="max-h-40 overflow-y-auto">
          {tracks.length === 0 && sequenceMode ? null : tracks.length === 0 ? (
            <p className="px-3 py-4 text-center font-mono text-xs text-zinc-600">
              No keyframes yet — click the diamond next to a parameter or Opacity to start animating it.
            </p>
          ) : (
            tracks.map((track) => (
              <div
                key={`${track.instanceId}:${track.paramId}`}
                className={`flex h-8 items-center border-b border-zinc-900 ${
                  selectedInstanceId === track.instanceId ? 'bg-zinc-900/50' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectInstance(track.instanceId)}
                  title={`${track.effectName} · ${track.paramLabel}`}
                  className="flex w-40 shrink-0 items-center gap-1.5 truncate px-2 text-left font-mono text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
                  <span className="truncate">
                    {track.effectName} · {track.paramLabel}
                  </span>
                </button>
                <div
                  className="relative h-full flex-1 cursor-pointer"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {track.keyframes.length > 1 && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                      {track.keyframes.slice(1).map((k, i) => (
                        <line
                          key={k.time}
                          x1={pct(track.keyframes[i].time)}
                          y1="50%"
                          x2={pct(k.time)}
                          y2="50%"
                          stroke={track.color}
                          strokeOpacity={0.4}
                          strokeWidth={1}
                        />
                      ))}
                    </svg>
                  )}
                  {track.keyframes.map((k) => (
                    <button
                      key={k.time}
                      type="button"
                      // Stop propagation on pointerDown too, not just click: the
                      // track row's pointerDown calls setPointerCapture, which
                      // retargets the subsequent click to the capturing track
                      // div instead of this button unless we bail out first.
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeKeyframe(track.instanceId, track.paramId, k.time)
                      }}
                      title={`t=${k.time.toFixed(2)}s · value=${Number(k.value.toFixed(3))} — click to remove`}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-zinc-950"
                      style={{ left: pct(k.time), backgroundColor: track.color }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: pct(currentTime) }} />
        </div>
      </div>
    </div>
  )
}
