# effectshop

Real-time WebGL image effect studio. 100% client-side — no server round trip;
all processing runs on the local GPU via Three.js post-processing.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Three.js `EffectComposer` / `ShaderPass` for the render pipeline, with an
  `OutputPass` always last in the chain — `EffectComposer`'s render targets
  are linear-space half-float buffers, and without `OutputPass` to re-encode
  back to the renderer's (sRGB) output color space, every effect pass made
  the image come out visibly too dark (gamma-decoded colors written straight
  to the screen). `RenderPass` alone (no effects applied) looked correct
  because it renders the textured mesh straight to the screen through
  Three's standard material pipeline, which *does* handle this automatically
  — only the custom-shader passes needed the explicit fix.
- Zustand for app state (effect stack, history, viewport)
- `@dnd-kit` for the drag-to-reorder Active Pipeline stack
- `lucide-react` for icons

## Effect Library & Presets thumbnails

Both the left sidebar's Effect Library and Presets tabs show a 2-column grid
of real rendered previews (`EffectLibrary.tsx`, `PresetList.tsx`), styled
after effect.app's own library grid (square, rounded, name below) with a
couple of details borrowed from ref-archive.site (hairline `border-white/10`
instead of a flat gray border, opacity-based secondary text instead of a
separate color token, a fade-in on image load). Each thumbnail is the
*actual* shader(s) rendered against a shared synthetic demo image
(`src/effects/thumbnailDemo.ts` — a gradient-sky portrait silhouette with
some noise/edges for every effect family to have something to grab onto,
generated on canvas rather than a bundled photo to avoid sourcing/licensing
one), not a hand-picked stock photo — so a new effect or preset gets an
accurate preview for free, with zero extra asset work. A preset's thumbnail
renders its *entire* effect chain, not just the first effect, so e.g. "90s
Cyberpunk" shows dither + RGB shift combined, same as applying it for real.
`src/effects/thumbnailRenderer.ts` owns one small offscreen Three.js renderer
(160×160, same `OutputPass` requirement as the main canvas) shared across
every thumbnail, renders once per effect/preset at its default/preset
parameters, and caches the result as a data URL, keyed separately for
single effects vs. presets since both can share an effect id; the
`useEffectThumbnail` / `usePresetThumbnail` hooks just read that cache from a
`useEffect` (a real WebGL draw call has no business running during render).

## Run it

```bash
npm install
npm run dev
```

`npm run build` produces a static `dist/` — this app has no backend, so any
static host works.

## Media support

Both still images and video are accepted (drag/drop or the Upload/Replace
button, `accept="image/*,video/*"`):

- **Images**: rendered via a static `THREE.Texture`. Exportable as a single
  PNG/JPG frame (see "Export resolution" below), or — since every image also
  gets a synthetic timeline (see below) — as a video, by rendering its
  keyframed animation over that timeline and recording it just like a real
  video export.
- **Video**: rendered live via `THREE.VideoTexture`, so every effect in the
  pipeline (and the before/after compare view) runs on the moving image in
  real time, not just a still frame. **Export Video** records the *processed*
  canvas output (post-effects) with `MediaRecorder` + `canvas.captureStream()`,
  playing the clip once from start to finish while recording. It tries
  `video/mp4` first and falls back to `video/webm` (`.mp4`/`.webm` extension
  matches whichever the browser's `MediaRecorder` actually supports — Safari
  records true MP4, most Chromium/Firefox builds still only support WebM).
  One scope cut here because it wasn't asked for and adds real complexity:
  **no audio track** — the source `<video>` is loaded muted (autoplay policy)
  and `captureStream()` only captures the canvas's pixels, not any audio.
- **Synthetic timeline for images**: images have no inherent duration, but
  keyframing and video export both need one, so every loaded image gets a
  default 5s "clip" (`DEFAULT_IMAGE_DURATION` in `useEffectStore.ts`),
  adjustable via the Duration field next to the playback transport (which,
  like video, appears once the image is loaded). Play/pause/scrub all work
  the same as video; there's just no real `<video>` element backing it, so
  `EffectRenderer.tsx`'s render loop advances `currentTime` itself each frame
  while playing (looping back to 0 at the end, matching video's `loop=true`)
  instead of reading it off a video element.
- **Parameter keyframes**: any slider parameter, plus each effect's Opacity,
  can be animated over the clip's timeline (video's real one, or an image's
  synthetic one — both work identically everywhere keyframing is exposed).
  Click the diamond/stopwatch icon next to a value (in the parameter panel,
  or next to Opacity on a pipeline card) to drop a keyframe at the playhead
  with that value; dragging the slider again while at least one keyframe
  exists updates/adds a keyframe at the current playhead instead of just
  changing a static value. Values are linearly interpolated between
  keyframes and held flat before the first / after the last one. See
  `src/lib/keyframes.ts` (interpolation), the `keyframes`-prefixed actions in
  `src/store/useEffectStore.ts`, and the per-frame evaluation in
  `EffectRenderer.tsx`'s render loop (needed because keyframed values must
  update every frame during playback/scrubbing, not just when a parameter is
  edited).
- **Timeline panel** (`src/components/center/Timeline.tsx`, shown whenever
  there's a timeline to scrub — video, or an image once loaded — sits
  between the canvas and the export bar): the single place to see and edit
  every keyframe at once, instead of hunting through each effect's parameter
  panel. One row per (effect, parameter) pair that currently has keyframes,
  each with its own color, a time ruler with a draggable/clickable playhead
  shared across all rows, and a connecting line between consecutive
  keyframes. Click anywhere in the ruler or a track to seek; click a
  keyframe diamond to delete it. The per-parameter stopwatch toggle buttons
  are still how you *start* animating a parameter (and remain the only
  keyframe UI visible in the parameter panel) — the Timeline is purely for
  reviewing/scrubbing/deleting across everything at once, so there's one
  editing surface rather than duplicated mini-tracks under every slider.
  One implementation note: each track row calls `setPointerCapture` on
  pointerdown so a drag that starts mid-row keeps scrubbing even if the
  pointer leaves the row; the keyframe diamond buttons have to stop that
  pointerdown from propagating (not just stop the click), otherwise the
  capture retargets their click to the row underneath instead of deleting
  the keyframe.

## Current scope

The original 6 PRD effects plus 17 more added later — 23 total — are all
implemented and enabled, for both images and video:

**Print & Texture**
- **Halftone Screen** (`src/effects/shaders/halftone.ts`)
- **Cross Hatch** (`src/effects/shaders/crossHatch.ts`) — pen-and-ink engraving lines
- **Emboss** (`src/effects/shaders/emboss.ts`) — directional relief/bump look

**Retro Display**
- **Dither** (`src/effects/shaders/dither.ts`) — ordered/Bayer dithering, see
  the "Dither approach" note below
- **CRT Screen / Scanlines** (`src/effects/shaders/crt.ts`)
- **Pixelate** (`src/effects/shaders/pixelate.ts`) — hard mosaic blocks
- **VHS Tracking** (`src/effects/shaders/vhs.ts`) — scanline jitter, tracking band, tape noise
- **Posterize** (`src/effects/shaders/posterize.ts`) — flat color-band quantization, no dither

**Glitch**
- **RGB Shift** (`src/effects/shaders/rgbShift.ts`)
- **ASCII Art** (`src/effects/shaders/ascii.ts`) — renders real characters via
  a Canvas2D-generated font-atlas texture (`src/effects/asciiAtlas.ts`), not
  a procedural pattern approximation
- **Block Glitch** (`src/effects/shaders/blockGlitch.ts`) — randomized row-block displacement/channel swap
- **Scan Displace** (`src/effects/shaders/scanDisplace.ts`) — smooth sine-wave scanline wobble

**Lens/Blur**
- **Tilt-Shift Blur** (`src/effects/shaders/tiltShift.ts`) — sharp band, blurred outside it
- **Zoom Blur** (`src/effects/shaders/zoomBlur.ts`) — radial motion-blur streaks from a center point

**Color/Tone**
- **Film Grain & Halation** (`src/effects/shaders/filmGrain.ts`) — animated
  grain (uses a per-frame `uTime` uniform, ticked in `EffectRenderer.tsx`'s
  render loop) + a cheap multi-tap halation glow
- **Duotone** (`src/effects/shaders/duotone.ts`) — luminance -> two-color gradient (heatmap/cyanotype style)
- **Vintage Fade** (`src/effects/shaders/vintageFade.ts`) — lifted blacks, warm tint, vignette

**Generate** — procedural/generative effects, several composite a
Canvas2D-authored texture on top of the source rather than being pure GLSL
(see "Overlay-texture effects" below)
- **Noise** (`src/effects/shaders/noiseGen.ts`) — animated per-pixel static
- **Ink Bleed** (`src/effects/shaders/inkBleed.ts`) — fbm-noise-distorted ink bleeding out from edges
- **Paper Scan** (`src/effects/shaders/paperScan.ts`) — flatbed-scanner look: streaks, dust, warp, vignette
- **Paper Cutout** (`src/effects/shaders/paperCutout.ts`) — posterized layers with a bold outline + offset shadow
- **Text** (`src/effects/textOverlay.ts` + `src/effects/shaders/overlayBlend.ts`) — stamps or tiles custom
  text over the image; the one effect with a `'text'` (free-entry string) parameter type
- **Blob Tracker** (`src/effects/blobDetector.ts` + `src/effects/blobTrackerOverlay.ts`) — stylized
  "AI vision" HUD: corner-bracket boxes, procedural tracking-ID labels and dashed connector lines
  over regions whose color is far from a chosen key color. This is **not** real object/person
  detection — it's a CPU-side chroma-key-style mask (small offscreen canvas, connected-component
  search, temporal smoothing/"persistence" for stability) feeding Canvas2D-drawn boxes/labels into
  the same overlay-texture pipeline as Text. Good enough to read as "live tracking" without an ML
  dependency; see `threshold`/`keyColor` params to tune per-image, same as the reference UI this
  was modeled on.

Presets (`src/presets/presets.ts`): Riso Zine, Retro CRT, 90s Cyberpunk,
Gameboy Noir, Thermal Scan — all live.

To add a new effect: write the shader in `src/effects/shaders/`, register a
`ShaderPass` factory + uniform updater for it in `src/engine/passes.ts`, and
add its entry (with `implemented: true`) to `src/effects/registry.ts`.

### Overlay-texture effects

Text and Blob Tracker don't fit the "uniforms in, pixels out" shape every
other effect uses — text layout and dashed HUD lines are far easier with the
Canvas2D API than GLSL. Both instead draw into a per-pass offscreen canvas
(`src/effects/overlayCanvas.ts`, keyed by `WeakMap<ShaderPass, ...>` so each
effect instance gets its own) and composite that canvas as a texture with a
trivial shared alpha-blend shader (`overlayBlend.ts`). Text's canvas is
redrawn synchronously whenever its parameters change (cheap). Blob Tracker's
needs the actual source pixels, which `updatePassUniforms` doesn't have
access to, so it's driven separately from `EffectRenderer.tsx`: once
immediately when the effect is added or the media changes, and then on a
150ms throttle during video playback (`BLOB_TRACKER_UPDATE_INTERVAL`) rather
than every frame — a full-resolution canvas redraw + pixel readback 60
times a second would be wasted work for a HUD that only needs to look live,
not actually track in real time.

## Assumptions & notable implementation choices

A few implementation-level details weren't specified in the PRD; these were
filled in with reasonable, low-risk defaults rather than blocking on them —
flag any of these if you want a different behavior:

- **Halftone `blendMode`** options: `Normal` (pure dot pattern) / `Multiply`
  (dots darken the source, keeping its color).
- **Export resolution**: the WebGL drawing buffer always matches the
  uploaded image's native pixel resolution; on-screen zoom is a pure CSS
  scale on top of that buffer, so "Export Image" is always full source
  resolution regardless of the current zoom level.
- **Wheel zoom** is centered on the viewport, not the cursor position.
- **Dither approach**: true Floyd-Steinberg error diffusion is inherently
  sequential (each pixel depends on already-dithered neighbors) and doesn't
  map onto a single-pass, fully-parallel GPU fragment shader in real time —
  so every `type` option renders with ordered (Bayer matrix) dithering
  instead, which is the standard real-time substitute. The 4 `type` names
  map to matrix-size + quantization-level pairs rather than distinct
  algorithms (see the comment at the top of `dither.ts`); `palette` recolors
  the quantized luminance (Monochrome = grayscale ramp, Gameboy/Cyberpunk =
  fixed 4-color lookup — the Cyberpunk palette's exact 4 colors are an
  original choice, not from the PRD).
- **ASCII Art**: implemented as real glyph rendering (a generated monospace
  font atlas sampled per screen-cell), not a geometric-pattern fake — this
  was the one effect where I judged the algorithm choice consequential
  enough to default deliberately rather than picking arbitrarily, though I
  didn't block on asking given it was clearly achievable either way.
- **Web Worker optimization** (mentioned in the PRD's tech stack) still
  isn't used — all effects are GPU-side WebGL work, which doesn't benefit
  from a Worker, and there's no CPU-heavy step (the originally-planned use
  case, Floyd-Steinberg, didn't end up being used per the note above).
- **Typeface**: the UI references `"Helvetica Now Display"` by name (with
  `Helvetica Neue` / `Helvetica` / `Arial` fallbacks) rather than embedding or
  distributing font files, since it's a commercial Monotype font — it renders
  correctly only on a machine where it's already installed/licensed, and
  falls back cleanly everywhere else. Both the `--font-sans` and `--font-mono`
  theme tokens point at it, because most of the visible UI (labels, buttons,
  numeric readouts) uses the `font-mono` utility for its industrial/technical
  feel — aliasing only `--font-sans` would have changed nothing on screen.
- **UI scale**: control heights, icon sizes, and type sizes were bumped up
  roughly one step across every panel (toolbar, sidebars, pipeline cards,
  parameter inputs) in response to feedback that the original UI ran too
  small — this was a general pass, not tied to specific pixel targets from
  the PRD.
