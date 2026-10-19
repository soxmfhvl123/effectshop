import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { useEffectStore, type EffectShopState } from '../store/useEffectStore'
import { createPass, isEffectRenderable, tickPassTime, updatePassUniforms } from './passes'
import { createBlankImage, FRAME_RATIOS, loadImageFromFile, loadVideoFromFile, isImageFile, isVideoFile } from '../lib/media'
import { downloadBlob } from '../lib/download'
import { evaluateEffectAtTime } from '../lib/keyframes'
import { updateBlobTrackerOverlay } from '../effects/blobTrackerOverlay'
import { updateMotionGlowOverlay } from '../effects/motionGlowOverlay'
import { updateObjectWarpTracking } from '../effects/objectWarpTracking'
import { updateMetaballTracking } from '../effects/metaballTracking'
import { updateFireflySwarmOverlay } from '../effects/fireflySwarmOverlay'
import { updateEchoTrailOverlay } from '../effects/echoTrailOverlay'
import { OVERLAY_UPDATERS } from '../effects/overlayRegistry'
import type { AppliedEffect } from '../types/effect'

const BLOB_TRACKER_UPDATE_INTERVAL = 0.15 // seconds between live re-detections during video playback

export interface EffectRendererHandle {
  exportImage: (format: 'png' | 'jpg') => void
  exportVideo: () => void
}

interface Props {
  onFps: (fps: number) => void
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

// Canvas.captureStream() is broadly supported (Chrome/Firefox/Safari) but not
// consistently present in TS's lib.dom typings across TS versions, so it's
// accessed via a narrow local augmentation rather than `any`.
type CaptureStreamCanvas = HTMLCanvasElement & { captureStream: (frameRate?: number) => MediaStream }

function pickVideoMimeType(): { mimeType: string; fileExtension: string } {
  const mimeCandidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  const mimeType = mimeCandidates.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) ?? 'video/webm'
  const fileExtension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
  return { mimeType, fileExtension }
}

// Records the processed canvas while the real <video> plays through once,
// start to finish, then downloads the result.
function exportRecordedVideo(canvas: CaptureStreamCanvas, video: HTMLVideoElement, store: EffectShopState) {
  const stream = canvas.captureStream(30)
  const { mimeType, fileExtension } = pickVideoMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const wasLooping = video.loop
  const wasPlaying = !video.paused
  video.loop = false

  const onProgress = () => {
    const duration = video.duration || 1
    store.setExporting(true, Math.min(1, video.currentTime / duration))
  }
  const onEnded = () => {
    if (recorder.state !== 'inactive') recorder.stop()
  }

  const cleanupListeners = () => {
    video.removeEventListener('timeupdate', onProgress)
    video.removeEventListener('ended', onEnded)
  }

  recorder.onstop = () => {
    cleanupListeners()
    video.loop = wasLooping
    store.setExporting(false, 0)
    const blob = new Blob(chunks, { type: mimeType })
    downloadBlob(blob, `effectshop-export.${fileExtension}`)
    video.currentTime = 0
    if (wasPlaying) video.play().catch(() => {})
  }

  video.addEventListener('timeupdate', onProgress)
  video.addEventListener('ended', onEnded)
  store.setExporting(true, 0)
  video.currentTime = 0
  recorder.start()
  video.play().catch(() => {})
}

// Records the processed canvas for a still image over its synthetic
// duration, driving the same isPlaying/currentTime state the live preview
// uses (EffectRenderer's RAF loop advances it and re-evaluates keyframes
// exactly as it does for on-screen playback) — a still image with no
// keyframes just produces a static-looking clip, which is a reasonable
// result rather than a special case to block.
function exportAnimatedImage(canvas: CaptureStreamCanvas, duration: number, store: EffectShopState) {
  const stream = canvas.captureStream(30)
  const { mimeType, fileExtension } = pickVideoMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const wasPlaying = store.isPlaying
  const startTime = performance.now()
  const progressTimer = window.setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000
    useEffectStore.getState().setExporting(true, Math.min(1, elapsed / duration))
  }, 100)
  const stopTimer = window.setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop()
  }, duration * 1000)

  recorder.onstop = () => {
    window.clearInterval(progressTimer)
    window.clearTimeout(stopTimer)
    const s = useEffectStore.getState()
    s.setExporting(false, 0)
    const blob = new Blob(chunks, { type: mimeType })
    downloadBlob(blob, `effectshop-export.${fileExtension}`)
    s.seek(0)
    s.setPlaying(wasPlaying)
  }

  store.setExporting(true, 0)
  store.seek(0)
  recorder.start()
  store.setPlaying(true)
}

export const EffectRenderer = forwardRef<EffectRendererHandle, Props>(function EffectRenderer({ onFps }, ref) {
  const outerRef = useRef<HTMLDivElement>(null) // sized/observed container (fills viewport area)
  const canvasHostRef = useRef<HTMLDivElement>(null) // exact-size div the WebGL canvas lives in
  const beforeVideoRef = useRef<HTMLVideoElement>(null) // mirrors sourceVideo for the before/after compare view

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const renderPassRef = useRef<RenderPass | null>(null)
  const outputPassRef = useRef<OutputPass | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const meshRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null>(null)
  const passMapRef = useRef<Map<string, ShaderPass>>(new Map())
  const rafRef = useRef(0)
  const onFpsRef = useRef(onFps)
  onFpsRef.current = onFps
  // "Latest value" refs so the animate() RAF loop (set up once, empty deps)
  // can read current effect/media state every frame without re-subscribing.
  const activeEffectsRef = useRef<AppliedEffect[]>([])
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null)
  const sourceImageRef = useRef<HTMLImageElement | null>(null)
  const resolutionRef = useRef(new THREE.Vector2(1, 1))
  const lastBlobUpdateRef = useRef(0)
  // Drives the synthetic "playhead" for images (no real <video> element to
  // read currentTime from): kept resynced to the store's currentTime every
  // render, then advanced independently inside the RAF loop while an image
  // is "playing", looping back to 0 at duration like video's loop=true.
  const imageClockRef = useRef(0)
  const mediaTypeRef = useRef<'image' | 'video' | null>(null)
  const isPlayingRef = useRef(false)
  const durationRef = useRef(0)

  const [fitScale, setFitScale] = useState(1)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const mediaType = useEffectStore((s) => s.mediaType)
  const sourceImage = useEffectStore((s) => s.sourceImage)
  const sourceVideo = useEffectStore((s) => s.sourceVideo)
  const imageWidth = useEffectStore((s) => s.imageWidth)
  const imageHeight = useEffectStore((s) => s.imageHeight)
  const activeEffects = useEffectStore((s) => s.activeEffects)
  const isComparing = useEffectStore((s) => s.isComparing)
  const comparePosition = useEffectStore((s) => s.comparePosition)
  const zoom = useEffectStore((s) => s.zoom)
  const zoomMode = useEffectStore((s) => s.zoomMode)
  const panX = useEffectStore((s) => s.panX)
  const panY = useEffectStore((s) => s.panY)
  const currentTime = useEffectStore((s) => s.currentTime)
  const duration = useEffectStore((s) => s.duration)
  const isPlaying = useEffectStore((s) => s.isPlaying)
  const setSourceImage = useEffectStore((s) => s.setSourceImage)
  const setSourceVideo = useEffectStore((s) => s.setSourceVideo)
  const setPlaying = useEffectStore((s) => s.setPlaying)
  const setPlaybackTime = useEffectStore((s) => s.setPlaybackTime)
  const setComparePosition = useEffectStore((s) => s.setComparePosition)
  const setZoomStore = useEffectStore((s) => s.setZoom)
  const setPan = useEffectStore((s) => s.setPan)

  const hasMedia = mediaType !== null

  activeEffectsRef.current = activeEffects
  sourceVideoRef.current = sourceVideo
  sourceImageRef.current = sourceImage
  resolutionRef.current.set(imageWidth || 1, imageHeight || 1)
  mediaTypeRef.current = mediaType
  isPlayingRef.current = isPlaying
  durationRef.current = duration
  if (!isPlaying) imageClockRef.current = currentTime

  // ---- one-time Three.js setup ------------------------------------------
  useEffect(() => {
    const host = canvasHostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
    renderer.setPixelRatio(1) // drawing buffer stays 1:1 with image resolution for exact export
    host.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    cameraRef.current = camera

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ transparent: true })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    meshRef.current = mesh

    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    renderPassRef.current = renderPass
    // EffectComposer's internal render targets are linear-space half-float
    // buffers; every effect ShaderPass reads/writes linear values, which is
    // correct for an HDR-ish post-processing chain but means nothing ever
    // re-encodes back to sRGB for display on its own. Without this pass as
    // the final one in the chain, every rendered frame comes out visibly
    // too dark (gamma-decoded colors written straight to the screen).
    const outputPass = new OutputPass()
    composer.addPass(outputPass)
    outputPassRef.current = outputPass
    composerRef.current = composer

    let lastTime = performance.now()
    let frames = 0
    let fpsAcc = 0
    const clockStart = performance.now()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const elapsed = (now - clockStart) / 1000

      // Advance the synthetic image "playhead" while an animated image is
      // playing (no real <video> element to drive it). Paused/scrubbing
      // state is handled by the ref-resync in the render body instead.
      if (mediaTypeRef.current === 'image' && isPlayingRef.current && durationRef.current > 0) {
        const frameDt = (now - lastTime) / 1000
        let next = imageClockRef.current + frameDt
        if (next >= durationRef.current) next -= durationRef.current
        imageClockRef.current = next
        setPlaybackTime(next, durationRef.current)
      }

      const playheadTime = sourceVideoRef.current?.currentTime ?? (mediaTypeRef.current === 'image' ? imageClockRef.current : 0)
      // Blob Tracker re-detects on a throttle (not every frame): a
      // full-resolution canvas redraw + pixel readback every frame would be
      // wasted work for a HUD that only needs to look "live". This applies
      // to images too, not just video — an image's pixels are static, but
      // its detection params (threshold, key color, ...) can be keyframed
      // and change over the image's synthetic timeline, which needs the
      // same periodic re-detection to actually show.
      const dueForBlobUpdate = elapsed - lastBlobUpdateRef.current >= BLOB_TRACKER_UPDATE_INTERVAL
      const mediaSource = sourceVideoRef.current ?? sourceImageRef.current
      if (dueForBlobUpdate && mediaSource) lastBlobUpdateRef.current = elapsed

      passMapRef.current.forEach((pass, instanceId) => {
        tickPassTime(pass, elapsed)
        const effect = activeEffectsRef.current.find((e) => e.instanceId === instanceId)
        if (!effect) return
        const hasKeyframes = effect.keyframes && Object.keys(effect.keyframes).length > 0
        const evaluatedEffect = hasKeyframes ? evaluateEffectAtTime(effect, playheadTime) : effect
        // Static (non-keyframed) params are already pushed by the
        // activeEffects-sync effect below; only keyframed effects need a
        // per-frame push so their animated values track video playback/scrub.
        if (hasKeyframes) {
          updatePassUniforms(pass, evaluatedEffect, resolutionRef.current)
        }
        if (effect.effectId === 'blobTracker' && dueForBlobUpdate && mediaSource) {
          updateBlobTrackerOverlay(pass, evaluatedEffect, mediaSource, resolutionRef.current)
        }
        // Motion Glow needs genuine frame-to-frame difference, so it only
        // makes sense against the real <video> element — a still image has
        // no second frame to diff against, so skip it there entirely.
        if (effect.effectId === 'motionGlow' && dueForBlobUpdate && sourceVideoRef.current) {
          updateMotionGlowOverlay(pass, evaluatedEffect, sourceVideoRef.current, resolutionRef.current)
        }
        if (effect.effectId === 'objectWarp' && dueForBlobUpdate && mediaSource) {
          updateObjectWarpTracking(pass, evaluatedEffect, mediaSource)
        }
        if (effect.effectId === 'liquidMetal' && dueForBlobUpdate && mediaSource) {
          updateMetaballTracking(pass, evaluatedEffect, mediaSource, resolutionRef.current)
        }
        // Firefly Swarm and Echo Trail simulate/decay every frame (not
        // gated by dueForBlobUpdate) so particle motion and trail fade stay
        // smooth -- each throttles its own underlying object detection
        // internally instead.
        if (effect.effectId === 'fireflySwarm' && mediaSource) {
          updateFireflySwarmOverlay(pass, evaluatedEffect, mediaSource, resolutionRef.current)
        }
        if (effect.effectId === 'echoTrail' && mediaSource) {
          updateEchoTrailOverlay(pass, evaluatedEffect, mediaSource, resolutionRef.current)
        }
        // Generic hook for any `kind: 'overlay'` effect registered in
        // overlayRegistry.ts (Blob Tracking and onward) -- one lookup here
        // instead of a dedicated if-block per effect.
        const overlayEntry = OVERLAY_UPDATERS[effect.effectId]
        if (overlayEntry && mediaSource && (!overlayEntry.throttled || dueForBlobUpdate)) {
          overlayEntry.update(pass, evaluatedEffect, mediaSource, resolutionRef.current)
        }
      })
      composer.render()
      const nowAfterRender = performance.now()
      const dt = nowAfterRender - lastTime
      lastTime = nowAfterRender
      frames++
      fpsAcc += dt
      if (fpsAcc >= 500) {
        onFpsRef.current(Math.round((frames * 1000) / fpsAcc))
        frames = 0
        fpsAcc = 0
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      passMapRef.current.forEach((p) => p.material.dispose())
      passMapRef.current.clear()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [])

  // ---- load source media (image OR video) into a texture -----------------
  useEffect(() => {
    const mesh = meshRef.current
    const renderer = rendererRef.current
    const composer = composerRef.current
    if (!mesh || !renderer || !composer) return
    if (!sourceImage && !sourceVideo) return

    let texture: THREE.Texture
    if (mediaType === 'video' && sourceVideo) {
      const videoTexture = new THREE.VideoTexture(sourceVideo)
      videoTexture.colorSpace = THREE.SRGBColorSpace
      texture = videoTexture
    } else if (sourceImage) {
      const imageTexture = new THREE.Texture(sourceImage)
      imageTexture.needsUpdate = true
      imageTexture.colorSpace = THREE.SRGBColorSpace
      imageTexture.minFilter = THREE.LinearFilter
      imageTexture.magFilter = THREE.LinearFilter
      texture = imageTexture
    } else {
      return
    }

    const prevTexture = mesh.material.map
    mesh.material.map = texture
    mesh.material.needsUpdate = true

    renderer.setSize(imageWidth, imageHeight, false)
    composer.setSize(imageWidth, imageHeight)

    return () => {
      texture.dispose()
      prevTexture?.dispose()
    }
  }, [sourceImage, sourceVideo, mediaType, imageWidth, imageHeight])

  // ---- keep store playback state in sync with the <video> element --------
  useEffect(() => {
    if (!sourceVideo) return
    const onTimeUpdate = () => setPlaybackTime(sourceVideo.currentTime, sourceVideo.duration || 0)
    const onLoadedMeta = () => setPlaybackTime(sourceVideo.currentTime, sourceVideo.duration || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    sourceVideo.addEventListener('timeupdate', onTimeUpdate)
    sourceVideo.addEventListener('loadedmetadata', onLoadedMeta)
    sourceVideo.addEventListener('play', onPlay)
    sourceVideo.addEventListener('pause', onPause)
    return () => {
      sourceVideo.removeEventListener('timeupdate', onTimeUpdate)
      sourceVideo.removeEventListener('loadedmetadata', onLoadedMeta)
      sourceVideo.removeEventListener('play', onPlay)
      sourceVideo.removeEventListener('pause', onPause)
    }
  }, [sourceVideo, setPlaybackTime, setPlaying])

  // ---- mirror the source video into the before/after "before" pane -------
  useEffect(() => {
    const beforeVideo = beforeVideoRef.current
    if (!beforeVideo || !sourceVideo) return
    beforeVideo.src = sourceVideo.currentSrc || sourceVideo.src
    beforeVideo.currentTime = sourceVideo.currentTime
  }, [sourceVideo])

  useEffect(() => {
    const beforeVideo = beforeVideoRef.current
    if (!beforeVideo || !sourceVideo || !isComparing) return
    const sync = () => {
      if (Math.abs(beforeVideo.currentTime - sourceVideo.currentTime) > 0.15) {
        beforeVideo.currentTime = sourceVideo.currentTime
      }
    }
    const onPlay = () => beforeVideo.play().catch(() => {})
    const onPause = () => beforeVideo.pause()
    sourceVideo.addEventListener('timeupdate', sync)
    sourceVideo.addEventListener('play', onPlay)
    sourceVideo.addEventListener('pause', onPause)
    if (!sourceVideo.paused) beforeVideo.play().catch(() => {})
    return () => {
      sourceVideo.removeEventListener('timeupdate', sync)
      sourceVideo.removeEventListener('play', onPlay)
      sourceVideo.removeEventListener('pause', onPause)
      beforeVideo.pause()
    }
  }, [sourceVideo, isComparing])

  // ---- sync effect stack -> composer passes -------------------------------
  useEffect(() => {
    const composer = composerRef.current
    const renderer = rendererRef.current
    if (!composer || !renderer) return

    const resolution = new THREE.Vector2(imageWidth || 1, imageHeight || 1)
    const liveIds = new Set<string>()
    const orderedPasses: ShaderPass[] = []

    for (const effect of activeEffects) {
      if (!effect.enabled || !isEffectRenderable(effect.effectId)) continue
      liveIds.add(effect.instanceId)
      let pass = passMapRef.current.get(effect.instanceId)
      if (!pass) {
        const created = createPass(effect)
        if (!created) continue
        pass = created
        passMapRef.current.set(effect.instanceId, pass)
      }
      updatePassUniforms(pass, effect, resolution)
      if (effect.effectId === 'blobTracker') {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          updateBlobTrackerOverlay(pass, evaluatedEffect, source, resolution)
        }
      }
      if (effect.effectId === 'motionGlow' && sourceVideo) {
        const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
        updateMotionGlowOverlay(pass, evaluatedEffect, sourceVideo, resolution)
      }
      if (effect.effectId === 'objectWarp') {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          updateObjectWarpTracking(pass, evaluatedEffect, source)
        }
      }
      if (effect.effectId === 'liquidMetal') {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          updateMetaballTracking(pass, evaluatedEffect, source, resolution)
        }
      }
      if (effect.effectId === 'fireflySwarm') {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          updateFireflySwarmOverlay(pass, evaluatedEffect, source, resolution)
        }
      }
      if (effect.effectId === 'echoTrail') {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          updateEchoTrailOverlay(pass, evaluatedEffect, source, resolution)
        }
      }
      const overlayEntry = OVERLAY_UPDATERS[effect.effectId]
      if (overlayEntry) {
        const source = sourceVideo ?? sourceImage
        if (source) {
          const evaluatedEffect = effect.keyframes ? evaluateEffectAtTime(effect, currentTime) : effect
          overlayEntry.update(pass, evaluatedEffect, source, resolution)
        }
      }
      orderedPasses.push(pass)
    }

    // drop cached passes for effects that were removed
    for (const [id, pass] of passMapRef.current) {
      if (!liveIds.has(id)) {
        pass.material.dispose()
        passMapRef.current.delete(id)
      }
    }

    const renderPass = renderPassRef.current
    const outputPass = outputPassRef.current
    if (!renderPass || !outputPass) return
    const nextPasses = [renderPass, ...orderedPasses, outputPass]
    nextPasses.forEach((p, i) => {
      p.renderToScreen = i === nextPasses.length - 1
    })
    composer.passes = nextPasses
  }, [activeEffects, imageWidth, imageHeight, sourceImage, sourceVideo])

  // ---- fit-to-container sizing ---------------------------------------------
  useEffect(() => {
    const outer = outerRef.current
    if (!outer || !imageWidth || !imageHeight) return

    const recompute = () => {
      const { width, height } = outer.getBoundingClientRect()
      const padding = 48
      const scale = Math.min((width - padding) / imageWidth, (height - padding) / imageHeight, 1)
      setFitScale(scale > 0 ? scale : 1)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(outer)
    return () => ro.disconnect()
  }, [imageWidth, imageHeight])

  const effectiveZoom = zoomMode === 'fit' ? fitScale : zoom

  // keep the store's displayed zoom % in sync while in fit mode
  useEffect(() => {
    if (zoomMode === 'fit') setZoomStore(fitScale, 'fit')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitScale, zoomMode])

  // ---- wheel zoom ------------------------------------------------------
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!imageWidth) return
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0015)
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, effectiveZoom * factor))
      setZoomStore(next, 'custom')
    },
    [effectiveZoom, imageWidth, setZoomStore],
  )

  // ---- space + drag pan --------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) setIsSpaceDown(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isSpaceDown) return
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY }
      ;(e.target as Element).setPointerCapture(e.pointerId)
    },
    [isSpaceDown, panX, panY],
  )
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPan(panStart.current.panX + dx, panStart.current.panY + dy)
    },
    [isPanning, setPan],
  )
  const handlePointerUp = useCallback(() => setIsPanning(false), [])

  // ---- before/after divider drag -----------------------------------------
  const handleDividerPointerDown = useCallback((e: React.PointerEvent) => {
    setIsDraggingDivider(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [])
  const handleDividerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingDivider) return
      const host = canvasHostRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setComparePosition(pct)
    },
    [isDraggingDivider, setComparePosition],
  )
  const handleDividerPointerUp = useCallback(() => setIsDraggingDivider(false), [])

  // ---- file drop / upload -------------------------------------------------
  const [isDragOver, setIsDragOver] = useState(false)
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      if (isVideoFile(file)) {
        const video = await loadVideoFromFile(file)
        setSourceVideo(video)
      } else if (isImageFile(file)) {
        const img = await loadImageFromFile(file)
        setSourceImage(img)
      }
    },
    [setSourceImage, setSourceVideo],
  )
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  // ---- export --------------------------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      exportImage: (format) => {
        const renderer = rendererRef.current
        const composer = composerRef.current
        if (!renderer || !composer) return
        composer.render()
        const mime = format === 'png' ? 'image/png' : 'image/jpeg'
        renderer.domElement.toBlob(
          (blob) => {
            if (blob) downloadBlob(blob, `effectshop-export.${format}`)
          },
          mime,
          0.95,
        )
      },
      exportVideo: () => {
        const renderer = rendererRef.current
        const composer = composerRef.current
        const store = useEffectStore.getState()
        if (!renderer || !composer) return
        if (store.isExporting) return

        const canvas = renderer.domElement as CaptureStreamCanvas
        if (typeof canvas.captureStream !== 'function') {
          window.alert('This browser does not support recording the canvas (captureStream unavailable).')
          return
        }

        if (store.mediaType === 'video' && store.sourceVideo) {
          exportRecordedVideo(canvas, store.sourceVideo, store)
        } else if (store.mediaType === 'image' && store.duration > 0) {
          exportAnimatedImage(canvas, store.duration, store)
        }
      },
    }),
    [],
  )

  const displayWidth = imageWidth * effectiveZoom
  const displayHeight = imageHeight * effectiveZoom

  return (
    <div
      ref={outerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle,#27272a_1px,transparent_1px)] [background-size:16px_16px]"
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {!hasMedia && (
        <div className="z-10 flex w-80 flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded border border-dashed border-zinc-700 bg-zinc-950/80 px-8 py-12 text-center transition-colors hover:border-zinc-500">
            <span className="font-sans text-sm uppercase tracking-widest text-zinc-400">
              {isDragOver ? 'Drop to load' : 'Drop an image or video, or click to upload'}
            </span>
            <span className="text-xs text-zinc-600">PNG, JPG, WEBP · MP4, WEBM, MOV</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <div className="flex flex-col items-center gap-2 rounded border border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Or start blank · frame</span>
            <div className="flex flex-wrap justify-center gap-1">
              {FRAME_RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={async () => setSourceImage(await createBlankImage(r))}
                  className="rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-[10px] tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* This host mounts unconditionally (even before media is loaded) so the
          Three.js renderer's one-time init effect always has a real DOM node to attach
          its <canvas> to. Previously this whole block was gated on `sourceImage`, which
          meant canvasHostRef.current was null on first mount and the WebGL renderer was
          never created at all -- nothing ever rendered, no matter what effects were added. */}
      <div
        className="relative select-none"
        style={{
          width: hasMedia ? displayWidth : 0,
          height: hasMedia ? displayHeight : 0,
          transform: `translate(${panX}px, ${panY}px)`,
          cursor: isSpaceDown ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {hasMedia && isComparing && mediaType === 'image' && sourceImage && (
          <img
            src={sourceImage.src}
            alt="Before"
            className="pointer-events-none absolute inset-0 h-full w-full"
            draggable={false}
          />
        )}
        {hasMedia && isComparing && mediaType === 'video' && (
          <video
            ref={beforeVideoRef}
            muted
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          />
        )}
        <div
          ref={canvasHostRef}
          className="absolute inset-0 h-full w-full [&>canvas]:h-full [&>canvas]:w-full"
          style={hasMedia && isComparing ? { clipPath: `inset(0 0 0 ${comparePosition}%)` } : undefined}
        />
        {hasMedia && isComparing && (
          <div
            className="absolute inset-y-0 z-10 w-4 -translate-x-1/2 cursor-ew-resize"
            style={{ left: `${comparePosition}%` }}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-100/80" />
            <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-400 bg-zinc-950 text-[10px] text-zinc-200">
              ↔
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
