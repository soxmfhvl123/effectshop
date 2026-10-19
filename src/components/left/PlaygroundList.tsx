import { Dices, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PLAYGROUND_KINDS, PLAYGROUND_TOOLS } from '../../effects/playground'
import type { PlaygroundKind, PlaygroundTool } from '../../effects/playground/types'
import { getEffectThumbnail } from '../../effects/thumbnailRenderer'
import { createBlankImage, FRAME_RATIOS, type FrameRatio } from '../../lib/media'
import { useEffectStore } from '../../store/useEffectStore'

type Order = 'newest' | 'oldest' | 'az'

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

function ToolRow({ tool, index, onAdd }: { tool: PlaygroundTool; index: number; onAdd: () => void }) {
  const thumb = useStaggeredThumbnail(tool.id, index)
  return (
    <button
      type="button"
      onClick={onAdd}
      title={`Add ${tool.name}`}
      className="group grid w-full grid-cols-[2.75rem_1.75rem_1fr] items-center gap-3 border-b border-zinc-800/70 px-3 py-2 text-left transition-colors hover:bg-zinc-900"
    >
      <span className="block aspect-square w-11 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
      </span>
      <span className="font-mono text-[11px] text-zinc-600">{pad(tool.no)}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-sm uppercase tracking-[0.2em] text-zinc-200 group-hover:text-white">{tool.name}</span>
        <span className="truncate font-mono text-[11px] text-zinc-500">{tool.makes}</span>
      </span>
    </button>
  )
}

export function PlaygroundList() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<PlaygroundKind | 'All'>('All')
  const [order, setOrder] = useState<Order>('newest')
  const [ratio, setRatio] = useState<FrameRatio>('4:5')
  const addEffect = useEffectStore((s) => s.addEffect)
  const setSourceImage = useEffectStore((s) => s.setSourceImage)
  const mediaType = useEffectStore((s) => s.mediaType)

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: PLAYGROUND_TOOLS.length }
    for (const t of PLAYGROUND_TOOLS) c[t.kind] = (c[t.kind] ?? 0) + 1
    return c
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = PLAYGROUND_TOOLS.filter((t) => {
      if (kind !== 'All' && t.kind !== kind) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.makes.toLowerCase().includes(q)) return false
      return true
    })
    if (order === 'newest') return [...list].sort((a, b) => b.no - a.no)
    if (order === 'oldest') return [...list].sort((a, b) => a.no - b.no)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [query, kind, order])

  const startBlank = async (r: FrameRatio) => {
    setRatio(r)
    setSourceImage(await createBlankImage(r))
  }

  // Generators don't need a photo: with nothing loaded, start a blank
  // canvas at the chosen frame first so the tool has something to draw on.
  const add = async (tool: PlaygroundTool) => {
    if (mediaType === null) setSourceImage(await createBlankImage(ratio))
    addEffect(tool.id)
  }

  const addRandom = () => {
    if (visible.length === 0) return
    add(visible[Math.floor(Math.random() * visible.length)])
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-zinc-800 p-3">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.2em]">
          <span className="text-zinc-600">Tools</span>
          <span className="text-zinc-300">{pad(PLAYGROUND_TOOLS.length)}</span>
          <span className="text-zinc-600">Kinds</span>
          <span className="text-zinc-300">{pad(PLAYGROUND_KINDS.length)}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-zinc-700 py-1 pl-3 pr-1">
          <Search size={13} className="shrink-0 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && visible[0]) add(visible[0])
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="FILTER · ALL TOOLS"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase tracking-[0.15em] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={addRandom}
            title="Add a random tool"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-900 hover:bg-white"
          >
            <Dices size={12} /> Random
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {(['All', ...PLAYGROUND_KINDS] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                kind === k ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {k === 'All' ? 'All Tools' : k}
              <span className={kind === k ? 'text-zinc-500' : 'text-zinc-600'}>{pad(counts[k] ?? 0)}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">Blank canvas · frame</span>
          <div className="flex flex-wrap gap-1">
            {FRAME_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => startBlank(r)}
                title={`New blank ${r} canvas`}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider transition-colors ${
                  ratio === r ? 'border-zinc-300 text-zinc-100' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 whitespace-nowrap border-b border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
        <span>No. · Tool · makes</span>
        <span className="flex gap-2">
          {(['newest', 'oldest', 'az'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrder(o)}
              className={order === o ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}
            >
              {o === 'az' ? 'A–Z' : o}
            </button>
          ))}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 && <p className="pt-8 text-center font-mono text-xs uppercase tracking-widest text-zinc-600">No match</p>}
        {visible.map((tool, i) => (
          <ToolRow key={tool.id} tool={tool} index={i} onAdd={() => add(tool)} />
        ))}
        <p className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
          Showing {pad(visible.length)} / {pad(PLAYGROUND_TOOLS.length)} · Enter — add first · Esc — clear
        </p>
      </div>
    </div>
  )
}
