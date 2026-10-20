import { Pause, Play, Redo2, RotateCcw, SplitSquareHorizontal, Undo2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
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
      className={`flex h-8 w-8 items-center justify-center rounded border text-zinc-300 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
          : 'border-transparent hover:border-zinc-700 hover:bg-zinc-900'
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
    <div className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-y-1 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded border border-zinc-800 px-3 py-1.5 font-mono text-sm uppercase tracking-wide text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
        >
          <Upload size={14} />
          {hasMedia ? 'Replace' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        <div className="mx-1 h-6 w-px bg-zinc-800" />

        <IconButton title="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton title="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 size={16} />
        </IconButton>
        <IconButton title="Reset all effects" onClick={resetAll} disabled={!hasMedia}>
          <RotateCcw size={16} />
        </IconButton>

        <div className="mx-1 h-6 w-px bg-zinc-800" />

        <IconButton title="Before / After split" onClick={toggleComparing} active={isComparing} disabled={!hasMedia}>
          <SplitSquareHorizontal size={16} />
        </IconButton>

        {(mediaType === 'video' || mediaType === 'image') && duration > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-zinc-800" />
            <IconButton
              title={isPlaying ? 'Pause' : 'Play'}
              onClick={togglePlayback}
              active={isPlaying}
              disabled={isExporting}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
            <span className="font-mono text-sm tabular-nums text-zinc-400">{formatTime(currentTime)}</span>
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
            <span className="font-mono text-sm tabular-nums text-zinc-600">{formatTime(duration)}</span>
            {mediaType === 'image' && (
              <>
                <span className="ml-1 font-mono text-xs text-zinc-600">Duration</span>
                <input
                  type="number"
                  min={0.5}
                  max={300}
                  step={0.5}
                  value={duration}
                  onChange={(e) => setImageDuration(Number(e.target.value))}
                  disabled={isExporting || sequenceMode}
                  title={sequenceMode ? 'Set by the scenes in Sequence mode' : "Length of this image's synthetic clip, for keyframing and video export"}
                  className="w-14 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-right font-mono text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                />
                <span className="font-mono text-xs text-zinc-600">s</span>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton title="Zoom out" onClick={() => setZoom(zoom / 1.25, 'custom')} disabled={!hasMedia}>
          <ZoomOut size={16} />
        </IconButton>
        <button
          type="button"
          onClick={zoomTo100}
          className="w-16 rounded border border-zinc-800 py-1.5 text-center font-mono text-sm text-zinc-300 hover:border-zinc-600"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton title="Zoom in" onClick={() => setZoom(zoom * 1.25, 'custom')} disabled={!hasMedia}>
          <ZoomIn size={16} />
        </IconButton>
        <button
          type="button"
          onClick={zoomToFit}
          className={`rounded border px-2.5 py-1.5 font-mono text-sm uppercase tracking-wide ${
            zoomMode === 'fit'
              ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          Fit
        </button>
        <button
          type="button"
          onClick={zoomTo100}
          className={`rounded border px-2.5 py-1.5 font-mono text-sm uppercase tracking-wide ${
            zoomMode === '100'
              ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          100%
        </button>
      </div>
    </div>
  )
}
