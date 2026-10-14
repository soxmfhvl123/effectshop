import { Download, Film } from 'lucide-react'
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
    <div className="flex h-10 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-3 font-mono text-sm text-zinc-500">
      <div className="flex items-center gap-4">
        <span>{hasMedia ? `${imageWidth} × ${imageHeight}` : '— × —'}</span>
        <span className={fps > 0 && fps < 30 ? 'text-amber-500' : ''}>{hasMedia ? `${fps} FPS` : '—'}</span>
        {isExporting && (
          <span className="text-zinc-300">Recording… {Math.round(exportProgress * 100)}%</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {mediaType === 'image' && (
          <>
            <div className="flex overflow-hidden rounded border border-zinc-800">
              {(['png', 'jpg'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-2 py-1 uppercase tracking-wide ${
                    format === f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!hasMedia || isExporting}
              onClick={() => rendererRef.current?.exportImage(format)}
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-100 px-2.5 py-1 uppercase tracking-wide text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Download size={13} />
              Export Image
            </button>
            <div className="mx-1 h-5 w-px bg-zinc-800" />
          </>
        )}

        {(mediaType === 'video' || mediaType === 'image') && (
          <button
            type="button"
            disabled={!hasMedia || isExporting}
            onClick={() => rendererRef.current?.exportVideo()}
            title={mediaType === 'image' ? "Records this image's keyframed animation over its Duration" : undefined}
            className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-100 px-2.5 py-1 uppercase tracking-wide text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Film size={13} />
            {isExporting ? 'Recording…' : 'Export Video'}
          </button>
        )}
      </div>
    </div>
  )
}
