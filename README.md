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

Both the left sidebar's Effects (library) and Presets tabs show a 2-column grid
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

The original 6 PRD effects plus 30 more added later — 36 total — are all
implemented and enabled, for both images and video:

**Print & Texture**
- **Halftone Screen** (`src/effects/shaders/halftone.ts`)
- **Cross Hatch** (`src/effects/shaders/crossHatch.ts`) — pen-and-ink engraving lines
- **Emboss** (`src/effects/shaders/emboss.ts`) — directional relief/bump look
- **Receipt Ticket** (`src/effects/shaders/receiptTicket.ts`) — convenience-store thermal-printer
  look: faded (not pure-black) Bayer-dithered ink, paper grain, vertical print-head streaks,
  horizontal density banding, and an optional narrower print width. `Torn Edges` cuts a zigzag
  out of the top/bottom to fully transparent (not a background-colored fill), so PNG export reads
  as an actual cutout receipt rather than a rectangle with a ragged line drawn on it.

**Retro Display**
- **Dither** (`src/effects/shaders/dither.ts`) — ordered/Bayer dithering, see
  the "Dither approach" note below. Palette also has a `Custom` option (free-form `inkColor`/
  `paperColor`, not just the three fixed Monochrome/Gameboy/Cyberpunk ramps), added for the
  "Aesthetics 07" batch's one-bit/receipt-style looks.
- **CRT Screen / Scanlines** (`src/effects/shaders/crt.ts`)
- **Pixelate** (`src/effects/shaders/pixelate.ts`) — hard mosaic blocks
- **VHS Tracking** (`src/effects/shaders/vhs.ts`) — scanline jitter, tracking band, tape noise
- **Posterize** (`src/effects/shaders/posterize.ts`) — flat color-band quantization, no dither
- **NTSC** (`src/effects/shaders/ntsc.ts`) — composite-video chroma bleed, R/B offset, dot-crawl noise
- **LED Screen** (`src/effects/shaders/ledScreen.ts`) — close-up RGB subpixel grid with darkened cell borders
- **Phosphor Monitor** (`src/effects/shaders/phosphor.ts`) — single-color monochrome CRT: brightness
  stepped to a handful of levels and remapped onto one phosphor color, a cheap single-pass
  circular-tap bloom on bright areas, analytic scanlines, and a slow `uTime`-driven flicker.

**Glitch**
- **RGB Shift** (`src/effects/shaders/rgbShift.ts`)
- **ASCII Art** (`src/effects/shaders/ascii.ts`) — renders real characters via
  a Canvas2D-generated font-atlas texture (`src/effects/asciiAtlas.ts`), not
  a procedural pattern approximation
- **Block Glitch** (`src/effects/shaders/blockGlitch.ts`) — randomized row-block displacement/channel swap
- **Scan Displace** (`src/effects/shaders/scanDisplace.ts`) — smooth sine-wave scanline wobble
- **Datamosh** (`src/effects/shaders/datamosh.ts`) — broken-compression-style glitch: a random
  subset of blocks (hashed from the block id, so the pattern is stable rather than re-rolled every
  pixel) get displaced and smeared along a direction, by default each block's own local brightness
  gradient — the cheap single-pass approximation of a real datamosh misapplying a neighboring
  block's motion vector.

**Lens/Blur**
- **Tilt-Shift Blur** (`src/effects/shaders/tiltShift.ts`) — sharp band, blurred outside it
- **Zoom Blur** (`src/effects/shaders/zoomBlur.ts`) — radial motion-blur streaks from a center point
- **Motion Blur** (`src/effects/shaders/motionBlur.ts`) — linear directional streak at a fixed angle
- **Radial Blur** (`src/effects/shaders/radialBlur.ts`) — rotational "spin" blur around a center point

**Color/Tone**
- **Film Grain & Halation** (`src/effects/shaders/filmGrain.ts`) — animated
  grain (uses a per-frame `uTime` uniform, ticked in `EffectRenderer.tsx`'s
  render loop) + a cheap multi-tap halation glow
- **Duotone** (`src/effects/shaders/duotone.ts`) — luminance -> two-color gradient (heatmap/cyanotype style)
- **Vintage Fade** (`src/effects/shaders/vintageFade.ts`) — lifted blacks, warm tint, vignette
- **Monochrome** (`src/effects/shaders/monochrome.ts`) — tinted black & white with a contrast curve
- **Levels** (`src/effects/shaders/levels.ts`) — classic black-point/white-point/gamma remap
- **Threshold** (`src/effects/shaders/threshold.ts`) — hard two-level black/white cutoff, distinct
  from Posterize (multiple bands) and Dither (patterned quantization)
- **Flash Light** (`src/effects/shaders/flashLight.ts`) — point-and-shoot flash fired at night: a
  bright falloff disc around a center point blows out highlights (a soft tone-curve clip toward
  white, not a hard clamp), everything outside it drops to an ambient level, and a hard-edged
  approximate shadow is cast just behind the subject by comparing each pixel's brightness against
  a shifted sample of itself (not a real shadow volume — "feels like a shadow fell behind them",
  not a physically correct one).

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
- **Point Cloud** (`src/effects/shaders/pointCloud.ts`) — scatters jittered dots over a grid, but
  only where that cell's sampled color is far enough from a chosen key color, i.e. only over
  "foreground"/object regions — same chroma-key mask idea as Blob Tracker, done per-pixel in pure
  GLSL instead of per-blob on the CPU, so it's a single shader pass with no canvas readback.
- **Flow Field** (`src/effects/shaders/flowField.ts`) — a grid of tick marks angled by a drifting
  value-noise field (classic TouchDesigner/creative-coding look); tick length also scales with the
  source image's local luminance so it visibly reads the picture, not just the noise.
- **Voronoi Cells** (`src/effects/shaders/voronoiCells.ts`) — animated cellular/Worley-noise mosaic:
  jittered feature points per grid cell, cell fill sampled from the source image at its nearest
  point, edges drawn via the standard F2-F1 (distance to 2nd-nearest minus nearest point) trick.
- **Object Glow** (`src/effects/shaders/objectGlow.ts`) — rim-light glow that follows the real
  detected silhouette (not a bounding box) of whatever's far from a key color: for every pixel it
  samples the same chroma-key mask at a ring of surrounding offsets, so the glow brightness tracks
  how close that pixel is to the actual object edge. Pure GLSL, single pass, works on stills too.
- **Color Isolation** (`src/effects/shaders/colorIsolation.ts`) — classic "color pop": desaturate
  and dim everything except the chroma-key-detected object, or (toggle `Tint Object`) tint just the
  object instead and leave the rest of the frame untouched. Same key-color/threshold mask as Object
  Glow/Point Cloud, applied as a per-pixel blend rather than a glow.
- **Motion Glow** (`src/effects/motionDetector.ts` + `src/effects/motionGlowOverlay.ts`) — genuine
  frame-to-frame pixel-difference motion detection (not chroma-key — it diffs the current frame
  against the previous one), with a JS-side particle trail that spawns at each detected motion
  region and fades out over `Trail Duration` rather than a GPU feedback buffer. **Video only**: a
  still image has no second frame to diff against, so it's a no-op there by design, not a bug.
- **Magnetic Field** (`src/effects/shaders/magneticField.ts`) — iron-filing-style flux lines that
  curve around the detected object instead of pointing at it: each grid cell samples the chroma-key
  mask at a ring of offsets to get a "which direction, how close" vector, then draws its tick along
  that vector's *perpendicular* (the standard "flow around an obstacle" trick) with a scrolling dash
  pattern for a sense of flow. Pure GLSL, no CPU detection beyond the mask itself.
- **Liquid Metal** (`src/effects/shaders/liquidMetal.ts` + `src/effects/metaballTracking.ts`) —
  every detected blob becomes a classic 2D metaball (implicit field `radius²/distance²` summed
  across up to 8 blobs via a fixed-size `uBalls` array uniform); wherever the summed field crosses
  `Merge Threshold`, two nearby objects visually fuse into one molten shape with no special-casing
  needed — that's just what the metaball math does. Inside the merged field the source image is
  refracted (sampled with an offset along the field's screen-space gradient) and tinted, with a
  bright rim right at the boundary.
- **Firefly Swarm** (`src/effects/fireflySwarmOverlay.ts`) — a persistent population of glowing
  particles, each on its own randomized orbit radius/speed/phase, that continuously circles the
  detected object. Unlike every other detection-driven effect, its per-frame simulate+draw call
  isn't gated by the shared blob-update throttle (particle motion needs to stay smooth every
  frame); only its own internal "where's the object" detection throttles itself, on the same
  150ms cadence. Trails come from fading the overlay canvas via a `destination-out` alpha
  multiply instead of clearing it — see "Overlay-texture effects" below.
- **Echo Trail** (`src/effects/echoTrailOverlay.ts`) — a true accumulation buffer: the object's
  actual per-pixel masked silhouette (soft-edged via a key-color-distance gradient, not a blob
  bounding box) is painted into a persistent canvas every frame, which is faded instead of cleared
  — the first overlay effect in the codebase where content survives across ticks, which is what
  produces the long-exposure light-painting look rather than a flat silhouette. Driven every frame
  for smooth decay, same as Firefly Swarm.

**Distort** — all pivot around a `centerX`/`centerY` point (`EffectCategory` in `src/types/effect.ts`):
- **Ripple** (`src/effects/shaders/ripple.ts`) — concentric sine waves displacing the sample
  radially outward from the center
- **Swirl** (`src/effects/shaders/swirl.ts`) — rotates the sample around the center by an angle
  that falls off (squared, so it's concentrated near the middle) with distance
- **Pinch / Bulge** (`src/effects/shaders/pinchBulge.ts`) — remaps sample radius by a power curve
  within a radius; positive amount bulges outward (fisheye-like), negative pinches inward
- **Object Warp** (`src/effects/objectWarpTracking.ts`) — reuses the Swirl shader, but
  `centerX`/`centerY` are driven automatically every detection tick by the chroma-key-detected
  object's position (largest blob, exponentially smoothed by `Follow Smoothing`) instead of being
  fixed sliders, so the distortion visually follows the object around the frame. Works on stills
  (center locks to the object's position) and video (center tracks it as it moves).

**Overlay** — new top-level category, built against the generic `kind: 'overlay'` hook (see
"Adding a new overlay effect" above):
- **Blob Tracking** (`src/effects/blobTrackingDetector.ts` + `blobTrackingOverlay.ts`) — a
  computer-vision-style HUD: boxes, connector lines and ID/coordinate labels over whatever's
  "salient" by one of three general measures (Brightness, Saturation, or Sobel edge magnitude) —
  no key color to pick, unlike Blob Tracker, so it reads reasonably on arbitrary photos out of the
  box. `Fill` (Invert/Threshold/Tint) composites straight into the overlay canvas with Canvas2D
  against a cached per-pass source-frame buffer (difference-blend, a thresholded sub-`ImageData`,
  or a tinted `source-atop`) rather than a dedicated shader, specifically so it stays on the same
  generic overlay-blend pass as every other overlay effect.

Presets (`src/presets/presets.ts`): Riso Zine, Retro CRT, 90s Cyberpunk,
Gameboy Noir, Thermal Scan, TouchDesigner (Duotone + Point Cloud + Flow Field,
tuned so Point Cloud's key color matches Duotone's shadow color — the object
mask still reads correctly after the duotone remap) — all live.

A second batch covers the 8 object-tracking effects: Subject Aura (Color
Isolation + Object Glow), Mercury (Liquid Metal + Monochrome), Flux Sketch
(Magnetic Field + Monochrome), Firefly Dusk (Firefly Swarm + Vintage Fade),
Afterglow (Echo Trail + Vintage Fade), Warp Drive (Object Warp + RGB Shift)
and Motion Trace (Motion Glow + VHS, video only). These all follow one
ordering rule: the tracking effect runs **first** (against the real source
colors, so its key-color mask reads correctly) and the color grade runs
**second**, on top of it — the reverse order would mean the tracking
effect's `keyColor` has to match whatever the grade happens to remap the
background to, which is fragile to tune and easy to break when either
effect's defaults change.

A third batch ("Aesthetics 07" — real-time shader versions of 7 trending SNS
photo styles) adds: Datamosh (Datamosh + RGB Shift), Blob Tracking (its
defaults), Flash Light (Flash Light + Film Grain & Halation), Receipt Ticket
(its defaults), One Bit Dither (Dither in 1-bit/custom-palette mode),
Pink Phosphor (Phosphor Monitor + CRT Screen) — "CRT" from that reference set
is identical to the existing Retro CRT preset above, so it isn't duplicated.

To add a new effect: write the shader in `src/effects/shaders/`, register a
`ShaderPass` factory + uniform updater for it in `src/engine/passes.ts`, and
add its entry (with `implemented: true`) to `src/effects/registry.ts`.

### Overlay-texture effects

Text, Blob Tracker, Motion Glow, Firefly Swarm and Echo Trail don't fit the
"uniforms in, pixels out" shape every other effect uses — text layout and
HUD/particle/trail drawing are far easier with the Canvas2D API than GLSL.
All five instead draw into a per-pass offscreen canvas
(`src/effects/overlayCanvas.ts`, keyed by `WeakMap<ShaderPass, ...>` so each
effect instance gets its own) and composite that canvas as a texture with a
trivial shared alpha-blend shader (`overlayBlend.ts`). **Resizing that
canvas recreates its `THREE.CanvasTexture` rather than reusing one**: a
reused texture can end up sampling stale GPU-side memory after the backing
canvas resizes (found via Blob Tracking's `Invert`/`Threshold`/`Tint` fill —
replacing the source image with one of a different aspect ratio left a
"ghost" box from the old image rendered on screen indefinitely, even though
the overlay canvas's own 2D pixel content was provably correct on every
tick; recreating the pass from scratch, e.g. by hiding and re-showing the
effect, always fixed it, which is what pointed at the texture object itself
rather than the drawing code). This affects every overlay effect, not just
the one that surfaced it. Text's canvas is
redrawn synchronously whenever its parameters change (cheap). The other four
need the actual source pixels, which `updatePassUniforms` doesn't have
access to, so they're driven separately from `EffectRenderer.tsx`:
- **Blob Tracker** and **Motion Glow** update once immediately when the
  effect is added or the media changes, then on a 150ms throttle during
  playback (`BLOB_TRACKER_UPDATE_INTERVAL`, shared by both) rather than
  every frame — a full-resolution canvas redraw + pixel readback 60 times a
  second would be wasted work for effects that only need to look live, not
  actually track in real time. Motion Glow keeps a small JS-side array of
  fading trail particles (`motionGlowOverlay.ts`) rather than a GPU
  ping-pong buffer, redrawing all of them into the overlay canvas each tick.
- **Firefly Swarm** and **Echo Trail** update every single frame instead,
  since particle motion and trail decay both need to stay smooth — each
  throttles its own internal object detection separately (same 150ms
  cadence) rather than sharing `BLOB_TRACKER_UPDATE_INTERVAL`. Echo Trail in
  particular is the one overlay effect whose canvas is *faded* (a
  `destination-out` alpha multiply) instead of cleared and redrawn each
  tick — that's what turns a per-frame silhouette into a persistent,
  decaying accumulation buffer, i.e. a real feedback-loop trail rather than
  a JS-managed particle pool. Firefly Swarm uses the same fade trick for its
  particles' comet tails.

Object Warp (`objectWarpTracking.ts`) and Liquid Metal
(`metaballTracking.ts`) follow the same "needs source pixels, driven from
EffectRenderer on the shared throttle" pattern, but aren't overlay-texture
effects — they reuse a normal GLSL pass and just push numeric/array uniforms
(`uCenterX`/`uCenterY`, or the `uBalls` metaball array) directly instead of
drawing anything to a canvas.

### Adding a new overlay effect (the `kind: 'overlay'` hook)

The five effects above each needed their own `if (effect.effectId === '...')`
block added to `EffectRenderer.tsx` (twice — once in the RAF loop, once in
the sync-effect-stack effect) and their own `PASS_FACTORY` entry in
`passes.ts`. That's fine for five effects built one at a time, but it means
every *new* overlay effect touches the same two files in the same four
places. **Blob Tracking** (Overlay category) is the first effect built
against a generic alternative instead, and new overlay effects should use
it too:

1. Give the effect's `EffectDefinition` in `registry.ts` `kind: 'overlay'`.
2. Write its detect+draw update function (same `(pass, effect, source,
   resolution) => void` shape as the five hand-written ones above — see
   `blobTrackingDetector.ts` + `blobTrackingOverlay.ts` for the pattern: a
   small offscreen canvas for CPU detection, `getOverlayCanvas` + Canvas2D
   for drawing, `texture.needsUpdate = true` + `uniforms.tOverlay.value =
   texture` at the end).
3. Register it in `src/effects/overlayRegistry.ts`'s `OVERLAY_UPDATERS` map,
   with `throttled: true` if it only needs to re-detect on the shared
   ~150ms cadence (a HUD-style effect) or omitted if it needs to run every
   frame (a particle sim, a decaying trail).

That's it — no `PASS_FACTORY` entry (`passes.ts` builds a generic
overlay-blend pass on demand for any `kind: 'overlay'` effect that doesn't
have one of its own), no `EffectRenderer.tsx` changes (its RAF loop and
sync-effect-stack effect each do one `OVERLAY_UPDATERS` lookup that covers
every registered overlay effect), and `thumbnailRenderer.ts` picks it up the
same way for free. The five pre-existing overlay effects were deliberately
**not** migrated onto this hook — they already work, and retrofitting five
shipped effects for symmetry alone isn't worth the regression risk; migrate
one only if you're already touching it for another reason.

Blob Tracking itself: unlike Blob Tracker (which keys off a chosen color),
it scores every pixel by Brightness, Saturation, or Sobel edge magnitude
(`blobTrackingDetector.ts`) — no key color needed, so it reads reasonably on
arbitrary photos out of the box. Its `fill` modes (Invert/Threshold/Tint)
are pure Canvas2D compositing against a per-pass source-frame buffer
(`difference` blend, a thresholded sub-`ImageData`, or `source-atop` tint)
rather than a dedicated shader + box-array uniform, specifically so it could
stay on the same generic overlay-blend pass as everything else.

## Playground (generative tools)

The left sidebar's tabs are **Effects** (the original library, renamed from
"Library"), **Playground**, and **Presets**. Playground is a catalogue of 52
generative tools — Backgrounds, Patterns, Posters, Textures, Badges —
modelled on the tool index at playgrnd.tools (its numbering, names and
"makes …" one-liners; the shaders themselves are original). The list is
styled after that site's index: tool/kind counters, a pill filter with a
**Random** button, kind chips with counts, numbered rows with tracked
uppercase names, and newest/oldest/A–Z ordering. Enter adds the first match,
Esc clears the filter.

Generators don't need a photo. **Blank canvas · frame** (in the Playground
tab and in the empty-canvas drop zone) starts a 1600px-long-side paper-color
canvas at 9:16 … 16:9 (`createBlankImage` in `src/lib/media.ts`), and adding
a tool with nothing loaded creates one at the selected frame automatically.
On a real photo, tools marked `imageReactive` expose an **Image** slider that
mixes the photo's luminance into the tool's own field, so the photo comes
through in the tool's inks and structure.

Everything lives in `src/effects/playground/` and is data-driven, so adding a
tool touches one file:

- `kit.ts` — one shared GLSL prelude every tool is compiled against.
  - Coordinates: `p` spans −0.5..0.5 on the canvas's short side, so a tool
    looks the same in a 160px thumbnail and at full size.
  - Seeded hashes and noise: `pgR`/`pgR2`, `pgNoise`, `pgFbm`,
    `pgDomainWarp`, `pgVoronoi`.
  - SDF helpers.
  - Ink lookup: `pgInk`, `pgInkGrad`, `pgInkStep`.
  - Bayer dithering: `pgInkD`, `pgDitherMask`.
  - Image influence (`pgField`).
  - `pgFinish`, which applies grain, the blend mode and opacity.
- `backgrounds.ts` / `patterns.ts` / `posters.ts` / `textures.ts` — one
  `PlaygroundTool` object per tool. Each has `id`, `no`, `name`, `makes`,
  `kind`, default `inks`, `params` and a GLSL `vec3 pgMain(vec2 p, vec2 uv)`.
- `definitions.ts` — turns each tool into a normal `EffectDefinition`
  (`playground` metadata set, so the Effects tab skips it). It adds the
  shared controls every tool gets:
  - **Variation** (seed)
  - **Image** (image-reactive tools only)
  - **Animate**, **Dither**, **Grain**
  - **Blend** (Normal / Multiply / Screen / Overlay)
  - **Inks**
- `build.ts` — one generic `ShaderPass` factory + uniform updater. A tool
  param `foo` becomes `uniform float p_foo` by convention (toggles → 0/1,
  selects → option index). That's why `passes.ts` routes every Playground id
  through `PLAYGROUND_MAP` rather than needing a `PASS_FACTORY` entry each.
- `palettes.ts` — 32 curated palettes for **New colors**, plus rotate/parse
  helpers.

Two parameter types were added for this, both rendered in
`ParameterInspector.tsx`:

- `seed`: a "New variation" reroll button plus a numeric field.
- `palette`: up to 8 color swatches with add/remove, **New colors** and
  **Rotate**.

The palette is stored as a comma-separated hex string so it fits the
existing `number | string | boolean` parameter values. Both are discrete
actions, so they go through the store's new `commitParameter`, which pushes
an undo step first; slider drags stay on `updateParameter`.

To add a tool: append an object to the right kind's file with a unique `pg…`
id and the next `no`, then write `pgMain` using the kit. It shows up in the
Playground list, gets a thumbnail, renders, exports and works in presets
with no other changes.

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
