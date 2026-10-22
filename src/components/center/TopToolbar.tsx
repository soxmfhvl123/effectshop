import { Pause, Play, Redo2, RotateCcw, SplitSquareHorizontal, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useRef } from 'react'
import { useEffectStore } from '../../store/useEffectStore'
import { loadImageFromFile, loadVideoFromFile, isImageFile, isVideoFile } from '../../lib/media'

function IconButton({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center border text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? 'border-ink' : 'border-transparent hover:border-hairline'
      }`}
    >
      {children}
    </button>
  )
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function TopToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaType = useEffectStore((s) => s.mediaType)
  const setSourceImage = useEffectStore((s) => s.setSourceImage)
  const setSourceVideo = useEffectStore((s) => s.setSourceVideo)
  const zoom = useEffectStore((s) => s.zoom)
  const zoomMode = useEffectStore((s) => s.zoomMode)
  const setZoom = useEffectStore((s) => s.setZoom)
  const zoomToFit = useEffectStore((s) => s.zoomToFit)
  const zoomTo100 = useEffectStore((s) => s.zoomTo100)
  const isComparing = useEffectStore((s) => s.isComparing)
  const toggleComparing = useEffectStore((s) => s.toggleComparing)
  const undo = useEffectStore((s) => s.undo)
  const redo = useEffectStore((s) => s.redo)
  const canUndo = useEffectStore((s) => s.canUndo())
  const canRedo = useEffectStore((s) => s.canRedo())
  const resetAll = useEffectStore((s) => s.resetAll)
  const isPlaying = useEffectStore((s) => s.isPlaying)
  const togglePlayback = useEffectStore((s) => s.togglePlayback)
  const currentTime = useEffectStore((s) => s.currentTime)
  const duration = useEffectStore((s) => s.duration)
  const seek = useEffectStore((s) => s.seek)
  const setImageDuration = useEffectStore((s) => s.setImageDuration)
  const isExporting = useEffectStore((s) => s.isExporting)
  const sequenceMode = useEffectStore((s) => s.sequenceMode)

  const hasMedia = mediaType !== null

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (isVideoFile(file)) {
      const video = await loadVideoFromFile(file)
      setSourceVideo(video)
    } else if (isImageFile(file)) {
      const img = await loadImageFromFile(file)
      setSourceImage(img)
    }
  }

  return (
    <div className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-y-1 border-b border-hairline bg-paper px-5 py-1.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="k-btn">
          {hasMedia ? 'REPLACE' : 'UPLOAD'} ↑
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        <div className="mx-1 h-6 w-px bg-hairline" />

        <IconButton title="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton title="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 size={16} />
        </IconButton>
        <IconButton title="Reset all effects" onClick={resetAll} disabled={!hasMedia}>
          <RotateCcw size={16} />
        </IconButton>

        <div className="mx-1 h-6 w-px bg-hairline" />

        <IconButton title="Before / After split" onClick={toggleComparing} active={isComparing} disabled={!hasMedia}>
          <SplitSquareHorizontal size={16} />
        </IconButton>

        {(mediaType === 'video' || mediaType === 'image') && duration > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-hairline" />
            <IconButton
              title={isPlaying ? 'Pause' : 'Play'}
              onClick={togglePlayback}
              active={isPlaying}
              disabled={isExporting}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
            <span className="k-meta tabular-nums text-ink">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={isExporting}
              className="w-32 sm:w-48"
            />
            <span className="k-meta tabular-nums text-dim">{formatTime(duration)}</span>
            {mediaType === 'image' && (
              <>
                <span className="k-meta ml-1 text-dim">Duration</span>
                <input
                  type="number"
                  min={0.5}
                  max={300}
                  step={0.5}
                  value={duration}
                  onChange={(e) => setImageDuration(Number(e.target.value))}
                  disabled={isExporting || sequenceMode}
                  title={sequenceMode ? 'Set by the scenes in Sequence mode' : "Length of this image's synthetic clip, for keyframing and video export"}
                  className="k-input w-14 text-right"
                />
                <span className="k-meta text-dim">s</span>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton title="Zoom out" onClick={() => setZoom(zoom / 1.25, 'custom')} disabled={!hasMedia}>
          <ZoomOut size={16} />
        </IconButton>
        <span className="k-meta w-12 text-center tabular-nums text-ink">{Math.round(zoom * 100)}%</span>
        <IconButton title="Zoom in" onClick={() => setZoom(zoom * 1.25, 'custom')} disabled={!hasMedia}>
          <ZoomIn size={16} />
        </IconButton>
        <div className="ml-2 flex gap-[14px]">
          <button type="button" onClick={zoomToFit} className={`k-filter ${zoomMode === 'fit' ? 'is-active' : ''}`}>
            FIT
          </button>
          <button type="button" onClick={zoomTo100} className={`k-filter ${zoomMode === '100' ? 'is-active' : ''}`}>
            100%
          </button>
        </div>
      </div>
    </div>
  )
}
