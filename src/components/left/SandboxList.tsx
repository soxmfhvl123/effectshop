import { useEffect, useMemo, useState } from 'react'
import { SANDBOX_KINDS, SANDBOX_TOOLS } from '../../effects/sandbox'
import type { SandboxKind, SandboxTool } from '../../effects/sandbox/types'
import { getEffectThumbnail } from '../../effects/thumbnailRenderer'
import { createBlankImage, FRAME_RATIOS, type FrameRatio } from '../../lib/media'
import { useEffectStore } from '../../store/useEffectStore'

type Order = 'asc' | 'desc' | 'az'

const pad = (n: number) => String(n).padStart(2, '0')

// Thumbnails compile one shader each, so stagger them instead of compiling
// all 52 in a single frame when the tab first opens.
function useStaggeredThumbnail(effectId: string, index: number): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setUrl(getEffectThumbnail(effectId)), 40 + index * 25)
    return () => window.clearTimeout(t)
  }, [effectId, index])
  return url
}

// A row of the Kinda index table: thumbnail, number, name, what it makes.
function ToolRow({ tool, index, onAdd }: { tool: SandboxTool; index: number; onAdd: () => void }) {
  const thumb = useStaggeredThumbnail(tool.id, index)
  return (
    <li className="border-b border-hairline">
      <button
        type="button"
        onClick={onAdd}
        title={`Add ${tool.name}`}
        className="grid w-full grid-cols-[2.5rem_1.75rem_1fr] items-center gap-3 py-2.5 text-left transition-opacity hover:opacity-45"
      >
        <span className="block aspect-square w-10 overflow-hidden bg-tile">
          {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
        </span>
        <span className="k-meta text-dim tabular-nums">{pad(tool.no)}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.95rem] text-ink">{tool.name}</span>
          <span className="k-meta truncate text-dim">{tool.makes}</span>
        </span>
      </button>
    </li>
  )
}

export function SandboxList() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<SandboxKind | 'All'>('All')
  const [order, setOrder] = useState<Order>('asc')
  const [ratio, setRatio] = useState<FrameRatio>('4:5')
  const addEffect = useEffectStore((s) => s.addEffect)
  const setSourceImage = useEffectStore((s) => s.setSourceImage)
  const mediaType = useEffectStore((s) => s.mediaType)

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: SANDBOX_TOOLS.length }
    for (const t of SANDBOX_TOOLS) c[t.kind] = (c[t.kind] ?? 0) + 1
    return c
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = SANDBOX_TOOLS.filter((t) => {
      if (kind !== 'All' && t.kind !== kind) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.makes.toLowerCase().includes(q)) return false
      return true
    })
    if (order === 'asc') return [...list].sort((a, b) => a.no - b.no)
    if (order === 'desc') return [...list].sort((a, b) => b.no - a.no)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [query, kind, order])

  const startBlank = async (r: FrameRatio) => {
    setRatio(r)
    setSourceImage(await createBlankImage(r))
  }

  // Generators don't need a photo: with nothing loaded, start a blank
  // canvas at the chosen frame first so the tool has something to draw on.
  const add = async (tool: SandboxTool) => {
    if (mediaType === null) setSourceImage(await createBlankImage(ratio))
    addEffect(tool.id)
  }

  const addRandom = () => {
    if (visible.length === 0) return
    add(visible[Math.floor(Math.random() * visible.length)])
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-4 border-b border-hairline px-5 py-4">
        <dl className="k-meta grid grid-cols-[90px_1fr]">
          <dt className="text-dim">Tools</dt>
          <dd className="text-ink tabular-nums">{pad(SANDBOX_TOOLS.length)}</dd>
          <dt className="text-dim">Kinds</dt>
          <dd className="text-ink tabular-nums">{pad(SANDBOX_KINDS.length)}</dd>
        </dl>

        <div className="flex items-stretch gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && visible[0]) add(visible[0])
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Filter all tools"
            className="k-input min-w-0 flex-1"
          />
          <button type="button" onClick={addRandom} title="Add a random tool" className="k-btn">
            RANDOM
          </button>
        </div>

        <div className="flex flex-wrap gap-x-[18px] gap-y-2">
          {(['All', ...SANDBOX_KINDS] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`k-filter ${kind === k ? 'is-active' : ''}`}>
              {k.toUpperCase()}
              <sup>{counts[k] ?? 0}</sup>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="k-label">BLANK CANVAS · FRAME</h3>
          <div className="flex flex-wrap gap-x-[14px] gap-y-2">
            {FRAME_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => startBlank(r)}
                title={`New blank ${r} canvas`}
                className={`k-filter tabular-nums ${ratio === r ? 'is-active' : ''}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
        {/* the Kinda index head: column names left, ordering right */}
        <div className="flex items-baseline justify-between gap-2 pb-2.5 text-[0.66rem] tracking-[0.1em] text-dim">
          <span>NO. · TOOL · MAKES</span>
          <span className="flex gap-3">
            {(['asc', 'desc', 'az'] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOrder(o)} className={`k-filter ${order === o ? 'is-active' : ''}`}>
                {o === 'az' ? 'A–Z' : o === 'asc' ? `01→${pad(SANDBOX_TOOLS.length)}` : `${pad(SANDBOX_TOOLS.length)}→01`}
              </button>
            ))}
          </span>
        </div>
        {visible.length === 0 && <p className="k-label pt-8 text-center">NO MATCH</p>}
        <ul className="border-t border-hairline">
          {visible.map((tool, i) => (
            <ToolRow key={tool.id} tool={tool} index={i} onAdd={() => add(tool)} />
          ))}
        </ul>
        <p className="k-label py-4">
          SHOWING {pad(visible.length)} / {pad(SANDBOX_TOOLS.length)} · ENTER — ADD FIRST · ESC — CLEAR
        </p>
      </div>
    </div>
  )
}
