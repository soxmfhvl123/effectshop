import { create } from 'zustand'
import type { AppliedEffect, MediaType, Preset, ZoomMode } from '../types/effect'
import { getEffectDefinition } from '../effects/registry'
import { findNearestKeyframe, removeKeyframeAt, upsertKeyframe } from '../lib/keyframes'

let instanceCounter = 0
const nextInstanceId = () => `fx_${Date.now()}_${instanceCounter++}`

// Images have no inherent duration, but keyframing/export-as-video need a
// timeline to animate over — this is the default length of that synthetic
// clip. Adjustable per-image via setImageDuration.
const DEFAULT_IMAGE_DURATION = 5

function snapshot(effects: AppliedEffect[]): AppliedEffect[] {
  return effects.map((e) => ({
    ...e,
    parameters: { ...e.parameters },
    keyframes: e.keyframes
      ? Object.fromEntries(Object.entries(e.keyframes).map(([paramId, kfs]) => [paramId, kfs.map((k) => ({ ...k }))]))
      : undefined,
  }))
}

interface HistoryState {
  past: AppliedEffect[][]
  future: AppliedEffect[][]
}

export interface EffectShopState {
  // --- source media (image OR video) ----------------------------------
  mediaType: MediaType | null
  sourceImage: HTMLImageElement | null
  sourceVideo: HTMLVideoElement | null
  imageWidth: number
  imageHeight: number
  setSourceImage: (img: HTMLImageElement) => void
  setSourceVideo: (video: HTMLVideoElement) => void
  clearMedia: () => void

  // --- playback (real for video; a synthetic clock for animated images) -
  isPlaying: boolean
  currentTime: number
  duration: number
  togglePlayback: () => void
  setPlaying: (playing: boolean) => void
  seek: (time: number) => void
  setPlaybackTime: (time: number, duration: number) => void
  setImageDuration: (seconds: number) => void

  // --- video export (record processed canvas to a file) ----------------
  isExporting: boolean
  exportProgress: number // 0..1
  setExporting: (isExporting: boolean, progress?: number) => void

  // --- effect pipeline (mirrors the PRD's EffectShopState spec) -----
  activeEffects: AppliedEffect[]
  selectedInstanceId: string | null
  addEffect: (effectId: string) => void
  removeEffect: (instanceId: string) => void
  toggleEffect: (instanceId: string) => void
  setEffectOpacity: (instanceId: string, opacity: number) => void
  reorderEffects: (startIndex: number, endIndex: number) => void
  updateParameter: (instanceId: string, paramId: string, value: number | string | boolean) => void
  resetParameter: (instanceId: string, paramId: string) => void
  selectInstance: (instanceId: string | null) => void
  loadPreset: (preset: Preset) => void
  resetAll: () => void

  // --- keyframes (per-effect parameter/opacity animation tracks) ------
  // `paramId` is a parameter's id, or the reserved key 'opacity'.
  toggleKeyframeAtCurrentTime: (instanceId: string, paramId: string, value: number) => void
  removeKeyframe: (instanceId: string, paramId: string, time: number) => void
  clearKeyframes: (instanceId: string, paramId: string) => void

  // --- undo / redo ----------------------------------------------------
  history: HistoryState
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // --- before/after compare -------------------------------------------
  isComparing: boolean
  comparePosition: number // 0 ~ 100
  toggleComparing: () => void
  setComparePosition: (pos: number) => void
  setComparing: (value: boolean) => void

  // --- viewport (zoom / pan) ------------------------------------------
  zoomMode: ZoomMode
  zoom: number // 1 = 100%
  panX: number
  panY: number
  setZoom: (zoom: number, mode?: ZoomMode) => void
  setPan: (x: number, y: number) => void
  zoomToFit: () => void
  zoomTo100: () => void
}

function pushHistory(get: () => EffectShopState, set: (partial: Partial<EffectShopState>) => void) {
  const { activeEffects, history } = get()
  set({
    history: {
      past: [...history.past, snapshot(activeEffects)].slice(-50),
      future: [],
    },
  })
}

export const useEffectStore = create<EffectShopState>((set, get) => ({
  mediaType: null,
  sourceImage: null,
  sourceVideo: null,
  imageWidth: 0,
  imageHeight: 0,
  setSourceImage: (img) =>
    set({
      mediaType: 'image',
      sourceImage: img,
      sourceVideo: null,
      imageWidth: img.naturalWidth,
      imageHeight: img.naturalHeight,
      zoomMode: 'fit',
      isPlaying: false,
      currentTime: 0,
      duration: DEFAULT_IMAGE_DURATION,
    }),
  setSourceVideo: (video) =>
    set({
      mediaType: 'video',
      sourceVideo: video,
      sourceImage: null,
      imageWidth: video.videoWidth,
      imageHeight: video.videoHeight,
      zoomMode: 'fit',
      isPlaying: false,
      currentTime: 0,
      duration: video.duration || 0,
    }),
  clearMedia: () =>
    set({
      mediaType: null,
      sourceImage: null,
      sourceVideo: null,
      imageWidth: 0,
      imageHeight: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }),

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  togglePlayback: () => {
    const { sourceVideo, isPlaying, mediaType, duration } = get()
    if (sourceVideo) {
      if (isPlaying) sourceVideo.pause()
      else sourceVideo.play().catch(() => {})
      set({ isPlaying: !isPlaying })
      return
    }
    // Images have no element to call play()/pause() on — EffectRenderer's
    // render loop advances currentTime itself while isPlaying is true.
    if (mediaType === 'image' && duration > 0) set({ isPlaying: !isPlaying })
  },
  setPlaying: (playing) => set({ isPlaying: playing }),
  setImageDuration: (seconds) => {
    const clamped = Math.min(300, Math.max(0.5, seconds))
    set((s) => ({ duration: clamped, currentTime: Math.min(s.currentTime, clamped) }))
  },
  seek: (time) => {
    const { sourceVideo } = get()
    if (sourceVideo) sourceVideo.currentTime = time
    set({ currentTime: time })
  },
  setPlaybackTime: (time, duration) => set({ currentTime: time, duration }),

  isExporting: false,
  exportProgress: 0,
  setExporting: (isExporting, progress = 0) => set({ isExporting, exportProgress: progress }),

  activeEffects: [],
  selectedInstanceId: null,

  addEffect: (effectId) => {
    const def = getEffectDefinition(effectId)
    if (!def || !def.implemented) return
    pushHistory(get, set)
    const instance: AppliedEffect = {
      instanceId: nextInstanceId(),
      effectId: def.id,
      name: def.name,
      enabled: true,
      opacity: 1,
      parameters: Object.fromEntries(def.parameters.map((p) => [p.id, p.value])),
    }
    set((s) => ({ activeEffects: [...s.activeEffects, instance], selectedInstanceId: instance.instanceId }))
  },

  removeEffect: (instanceId) => {
    pushHistory(get, set)
    set((s) => ({
      activeEffects: s.activeEffects.filter((e) => e.instanceId !== instanceId),
      selectedInstanceId: s.selectedInstanceId === instanceId ? null : s.selectedInstanceId,
    }))
  },

  toggleEffect: (instanceId) => {
    pushHistory(get, set)
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => (e.instanceId === instanceId ? { ...e, enabled: !e.enabled } : e)),
    }))
  },

  setEffectOpacity: (instanceId, opacity) => {
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const track = e.keyframes?.opacity
        if (track && track.length > 0) {
          const time = s.currentTime
          return { ...e, opacity, keyframes: { ...e.keyframes, opacity: upsertKeyframe(track, time, opacity) } }
        }
        return { ...e, opacity }
      }),
    }))
  },

  reorderEffects: (startIndex, endIndex) => {
    pushHistory(get, set)
    set((s) => {
      const next = [...s.activeEffects]
      const [moved] = next.splice(startIndex, 1)
      next.splice(endIndex, 0, moved)
      return { activeEffects: next }
    })
  },

  updateParameter: (instanceId, paramId, value) => {
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const track = e.keyframes?.[paramId]
        if (track && track.length > 0 && typeof value === 'number') {
          const time = s.currentTime
          return {
            ...e,
            parameters: { ...e.parameters, [paramId]: value },
            keyframes: { ...e.keyframes, [paramId]: upsertKeyframe(track, time, value) },
          }
        }
        return { ...e, parameters: { ...e.parameters, [paramId]: value } }
      }),
    }))
  },

  resetParameter: (instanceId, paramId) => {
    pushHistory(get, set)
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const def = getEffectDefinition(e.effectId)
        const original = def?.parameters.find((p) => p.id === paramId)?.value
        if (original === undefined) return e
        const keyframes = { ...e.keyframes }
        delete keyframes[paramId]
        return { ...e, parameters: { ...e.parameters, [paramId]: original }, keyframes }
      }),
    }))
  },

  selectInstance: (instanceId) => set({ selectedInstanceId: instanceId }),

  toggleKeyframeAtCurrentTime: (instanceId, paramId, value) => {
    pushHistory(get, set)
    const time = get().currentTime
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const track = e.keyframes?.[paramId] ?? []
        const existing = findNearestKeyframe(track, time)
        const nextTrack = existing ? removeKeyframeAt(track, existing.time) : upsertKeyframe(track, time, value)
        const keyframes = { ...e.keyframes }
        if (nextTrack.length === 0) delete keyframes[paramId]
        else keyframes[paramId] = nextTrack
        return { ...e, keyframes }
      }),
    }))
  },

  removeKeyframe: (instanceId, paramId, time) => {
    pushHistory(get, set)
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const track = e.keyframes?.[paramId] ?? []
        const nextTrack = removeKeyframeAt(track, time)
        const keyframes = { ...e.keyframes }
        if (nextTrack.length === 0) delete keyframes[paramId]
        else keyframes[paramId] = nextTrack
        return { ...e, keyframes }
      }),
    }))
  },

  clearKeyframes: (instanceId, paramId) => {
    pushHistory(get, set)
    set((s) => ({
      activeEffects: s.activeEffects.map((e) => {
        if (e.instanceId !== instanceId) return e
        const keyframes = { ...e.keyframes }
        delete keyframes[paramId]
        return { ...e, keyframes }
      }),
    }))
  },

  loadPreset: (preset) => {
    if (!preset.implemented) return
    pushHistory(get, set)
    const instances: AppliedEffect[] = preset.effects.map((e) => ({
      ...e,
      instanceId: nextInstanceId(),
      parameters: { ...e.parameters },
    }))
    set({ activeEffects: instances, selectedInstanceId: instances[0]?.instanceId ?? null })
  },

  resetAll: () => {
    pushHistory(get, set)
    set({ activeEffects: [], selectedInstanceId: null })
  },

  history: { past: [], future: [] },
  undo: () => {
    const { history, activeEffects } = get()
    const prev = history.past[history.past.length - 1]
    if (!prev) return
    set({
      activeEffects: prev,
      history: {
        past: history.past.slice(0, -1),
        future: [snapshot(activeEffects), ...history.future].slice(0, 50),
      },
    })
  },
  redo: () => {
    const { history, activeEffects } = get()
    const next = history.future[0]
    if (!next) return
    set({
      activeEffects: next,
      history: {
        past: [...history.past, snapshot(activeEffects)].slice(-50),
        future: history.future.slice(1),
      },
    })
  },
  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  isComparing: false,
  comparePosition: 50,
  toggleComparing: () => set((s) => ({ isComparing: !s.isComparing })),
  setComparePosition: (pos) => set({ comparePosition: Math.min(100, Math.max(0, pos)) }),
  setComparing: (value) => set({ isComparing: value }),

  zoomMode: 'fit',
  zoom: 1,
  panX: 0,
  panY: 0,
  setZoom: (zoom, mode = 'custom') => set({ zoom: Math.min(8, Math.max(0.05, zoom)), zoomMode: mode }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  zoomToFit: () => set({ zoomMode: 'fit', panX: 0, panY: 0 }),
  zoomTo100: () => set({ zoomMode: '100', zoom: 1, panX: 0, panY: 0 }),
}))
