import { useState } from 'react'
import { useEffectStore } from '../../store/useEffectStore'
import type { EffectRendererHandle } from '../../engine/EffectRenderer'

export function BottomBar({ rendererRef, fps }: { rendererRef: React.RefObject<EffectRendererHandle | null>; fps: number }) {
  const mediaType = useEffectStore((s) => s.mediaType)
  const imageWidth = useEffectStore((s) => s.imageWidth)
  const imageHeight = useEffectStore((s) => s.imageHeight)
  const isExporting = useEffectStore((s) => s.isExporting)
  const exportProgress = useEffectStore((s) => s.exportProgress)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')

  const hasMedia = mediaType !== null

  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-hairline bg-paper px-5">
      <dl className="k-meta flex items-center gap-4 tabular-nums">
        <span className="flex gap-2">
          <dt className="text-dim">Size</dt>
          <dd className="text-ink">{hasMedia ? `${imageWidth} × ${imageHeight}` : '—'}</dd>
        </span>
        <span className="flex gap-2">
          <dt className="text-dim">Fps</dt>
          <dd className={fps > 0 && fps < 30 ? 'text-amber-500' : 'text-ink'}>{hasMedia ? fps : '—'}</dd>
        </span>
        {isExporting && <span className="text-ink">Recording… {Math.round(exportProgress * 100)}%</span>}
      </dl>

      <div className="flex items-center gap-2">
        {mediaType === 'image' && (
          <>
            <div className="mr-1 flex gap-[14px]">
              {(['png', 'jpg'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)} className={`k-filter ${format === f ? 'is-active' : ''}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!hasMedia || isExporting}
              onClick={() => rendererRef.current?.exportImage(format)}
              className="k-btn"
            >
              EXPORT IMAGE ↓
            </button>
          </>
        )}

        {(mediaType === 'video' || mediaType === 'image') && (
          <button
            type="button"
            disabled={!hasMedia || isExporting}
            onClick={() => rendererRef.current?.exportVideo()}
            title={mediaType === 'image' ? "Records this image's keyframed animation over its Duration" : undefined}
            className="k-btn"
          >
            {isExporting ? 'RECORDING…' : 'EXPORT VIDEO ↓'}
          </button>
        )}
      </div>
    </div>
  )
}
