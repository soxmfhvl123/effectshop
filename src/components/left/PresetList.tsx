import { useEffect, useState } from 'react'
import { PRESETS } from '../../presets/presets'
import { getPresetThumbnail } from '../../effects/thumbnailRenderer'
import { useEffectStore } from '../../store/useEffectStore'
import type { Preset } from '../../types/effect'

// Generated once per preset (the full effect chain rendered against the
// shared demo image — see thumbnailRenderer.ts) and cached there; this hook
// just reads it into component state. Deferred to an effect (not computed
// during render) since it does a real WebGL draw call.
function usePresetThumbnail(preset: Preset): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(getPresetThumbnail(preset))
  }, [preset])
  return url
}

function PresetThumbnailCard({ preset, disabled, onLoad }: { preset: Preset; disabled: boolean; onLoad: () => void }) {
  const thumbnail = usePresetThumbnail(preset)
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onLoad}
      title={!preset.implemented ? 'Coming soon' : disabled ? 'Upload an image or video first' : `Load ${preset.name}`}
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
        {!preset.implemented && (
          <span className="k-filter absolute right-1.5 top-1.5 bg-paper/80 px-1.5 py-0.5">
            Soon
          </span>
        )}
      </div>
      <span className="k-meta flex flex-col">
        <span className="truncate text-ink">{preset.name}</span>
        <span className="truncate text-dim">{preset.effects.length} effect{preset.effects.length === 1 ? '' : 's'}</span>
      </span>
    </button>
  )
}

export function PresetList() {
  const loadPreset = useEffectStore((s) => s.loadPreset)
  const mediaType = useEffectStore((s) => s.mediaType)
  const hasMedia = mediaType !== null

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <h2 className="k-label mb-4">SELECTED LOOKS</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {PRESETS.map((preset) => (
          <PresetThumbnailCard
            key={preset.id}
            preset={preset}
            disabled={!preset.implemented || !hasMedia}
            onLoad={() => loadPreset(preset)}
          />
        ))}
      </div>
    </div>
  )
}
