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
      <div className="relative aspect-square overflow-hidden bg-tile transition-opacity group-hover:opacity-80">
        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {!effect.implemented && (
          <span className="k-filter absolute right-1.5 top-1.5 bg-paper/80 px-1.5 py-0.5">
            Soon
          </span>
        )}
      </div>
      <span className="k-meta flex flex-col">
        <span className="truncate text-ink">{effect.name}</span>
        <span className="truncate text-dim">{effect.category}</span>
      </span>
    </button>
  )
}

export function EffectLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof EFFECT_CATEGORIES)[number]>('All')
  const addEffect = useEffectStore((s) => s.addEffect)
  const mediaType = useEffectStore((s) => s.mediaType)
  const hasMedia = mediaType !== null

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of EFFECT_REGISTRY) {
      if (e.sandbox) continue
      c.All = (c.All ?? 0) + 1
      c[e.category] = (c[e.category] ?? 0) + 1
    }
    return c
  }, [])

  const filtered = useMemo(() => {
    return EFFECT_REGISTRY.filter((e) => {
      if (e.sandbox) return false
      if (category !== 'All' && e.category !== (category as EffectCategory)) return false
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [query, category])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-hairline px-5 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="k-input w-full"
        />
        {/* the Kinda filter row: upper-case labels with counts, the active one underlined */}
        <div className="flex flex-wrap gap-x-[18px] gap-y-2">
          {EFFECT_CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={`k-filter ${category === c ? 'is-active' : ''}`}>
              {c.toUpperCase()}
              <sup>{counts[c] ?? 0}</sup>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 && <p className="k-label pt-8 text-center">NO EFFECTS MATCH</p>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
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
