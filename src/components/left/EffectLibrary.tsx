import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EFFECT_CATEGORIES, EFFECT_REGISTRY } from '../../effects/registry'
import { getEffectThumbnail } from '../../effects/thumbnailRenderer'
import { useEffectStore } from '../../store/useEffectStore'
import type { EffectCategory, EffectDefinition } from '../../types/effect'

// Generated once per effectId (real shader output against a shared demo
// image — see thumbnailRenderer.ts) and cached there; this hook just reads
// it into component state. Deferred to an effect (not computed during
// render) since it does a real WebGL draw call.
function useEffectThumbnail(effectId: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(getEffectThumbnail(effectId))
  }, [effectId])
  return url
}

function EffectThumbnailCard({ effect, disabled, onAdd }: { effect: EffectDefinition; disabled: boolean; onAdd: () => void }) {
  const thumbnail = useEffectThumbnail(effect.id)
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAdd}
      title={!effect.implemented ? 'Coming soon' : disabled ? 'Upload an image or video first' : `Add ${effect.name}`}
      className="group flex flex-col gap-1.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-colors group-hover:border-white/25">
        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {!effect.implemented && (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-zinc-300">
            Soon
          </span>
        )}
      </div>
      <span className="truncate px-0.5 font-mono text-xs text-zinc-100/70 group-hover:text-zinc-100/90">{effect.name}</span>
    </button>
  )
}

export function EffectLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof EFFECT_CATEGORIES)[number]>('All')
  const addEffect = useEffectStore((s) => s.addEffect)
  const mediaType = useEffectStore((s) => s.mediaType)
  const hasMedia = mediaType !== null

  const filtered = useMemo(() => {
    return EFFECT_REGISTRY.filter((e) => {
      if (category !== 'All' && e.category !== (category as EffectCategory)) return false
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [query, category])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 p-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search effects…"
            className="w-full rounded border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {EFFECT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                category === c ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <p className="pt-8 text-center font-mono text-sm text-zinc-600">No effects match.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((effect) => (
            <EffectThumbnailCard
              key={effect.id}
              effect={effect}
              disabled={!effect.implemented || !hasMedia}
              onAdd={() => addEffect(effect.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
