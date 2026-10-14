// Draws the Text effect's Canvas2D overlay: either one centered/rotated
// stamp of the string, or a rotated brick-pattern tiling of it that covers
// the canvas regardless of rotation angle.
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { text: string; size: number; color: string; angle: number; tile: boolean },
) {
  const { canvas } = ctx
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const text = opts.text.trim() || 'TEXT'
  ctx.fillStyle = opts.color
  ctx.font = `bold ${opts.size}px "Helvetica Now Display", "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  const angleRad = (opts.angle * Math.PI) / 180

  if (!opts.tile) {
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(angleRad)
    ctx.fillText(text, 0, 0)
    ctx.restore()
    return
  }

  const metrics = ctx.measureText(text)
  const stepX = Math.max(metrics.width + opts.size, 20)
  const stepY = Math.max(opts.size * 2, 20)
  const diag = Math.hypot(canvas.width, canvas.height)
  const cols = Math.ceil(diag / stepX) + 2
  const rows = Math.ceil(diag / stepY) + 2

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(angleRad)
  for (let row = -rows; row <= rows; row++) {
    const offsetX = row % 2 === 0 ? 0 : stepX / 2
    for (let col = -cols; col <= cols; col++) {
      ctx.fillText(text, col * stepX + offsetX, row * stepY)
    }
  }
  ctx.restore()
}
