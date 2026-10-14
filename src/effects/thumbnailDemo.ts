// Synthetic demo image used to render every effect's library thumbnail.
// A real bundled photo would need licensing/sourcing; this draws a portrait-
// like scene (gradient sky, a soft "subject" silhouette, a bright highlight,
// and some high-frequency texture) with enough luminance/color/edge variety
// that every effect family (print, glitch, blur, color, generate) produces a
// recognizably different, reasonably attractive preview.
let cached: HTMLCanvasElement | null = null

export function getDemoCanvas(): HTMLCanvasElement {
  if (cached) return cached

  const size = 320
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  const sky = ctx.createLinearGradient(0, 0, 0, size)
  sky.addColorStop(0, '#1a2a4a')
  sky.addColorStop(0.55, '#3d5a8a')
  sky.addColorStop(1, '#e8966a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, size)

  const sun = ctx.createRadialGradient(size * 0.72, size * 0.3, 2, size * 0.72, size * 0.3, size * 0.22)
  sun.addColorStop(0, 'rgba(255,240,210,0.95)')
  sun.addColorStop(1, 'rgba(255,240,210,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, size, size)

  // soft portrait silhouette (head + shoulders)
  ctx.fillStyle = 'rgba(15,12,20,0.88)'
  ctx.beginPath()
  ctx.ellipse(size * 0.42, size * 0.42, size * 0.16, size * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(size * 0.1, size * 1.0)
  ctx.quadraticCurveTo(size * 0.42, size * 0.55, size * 0.74, size * 1.0)
  ctx.closePath()
  ctx.fill()

  // a few hard-edged color blocks (clothing/foreground accents) for edge-
  // detect / posterize / cutout style effects to have something to grab
  ctx.fillStyle = '#d14b3a'
  ctx.fillRect(size * 0.08, size * 0.78, size * 0.22, size * 0.14)
  ctx.fillStyle = '#e8e0c8'
  ctx.beginPath()
  ctx.arc(size * 0.42, size * 0.33, size * 0.035, 0, Math.PI * 2)
  ctx.fill()

  // fine texture speckle so grain/noise/dither-style effects have detail to
  // work with even in flat gradient regions
  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 10
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(imgData, 0, 0)

  cached = canvas
  return canvas
}
