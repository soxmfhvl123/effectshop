export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export function loadVideoFromFile(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true // required by browser autoplay policy for programmatic play()
    video.playsInline = true
    video.loop = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    video.src = url
  })
}

// Frame ratios offered for a blank canvas, as width:height.
export const FRAME_RATIOS = ['9:16', '3:4', '4:5', '1:1', '5:4', '4:3', '3:2', '16:9'] as const
export type FrameRatio = (typeof FRAME_RATIOS)[number]

const BLANK_LONG_SIDE = 1600

// A plain off-white canvas to run generators on when there's no photo --
// it goes through the exact same sourceImage path as an uploaded image, so
// export, keyframes and video export all work unchanged.
export function createBlankImage(ratio: FrameRatio, color = '#efece4'): Promise<HTMLImageElement> {
  const [rw, rh] = ratio.split(':').map(Number)
  const scale = BLANK_LONG_SIDE / Math.max(rw, rh)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rw * scale)
  canvas.height = Math.round(rh * scale)
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = canvas.toDataURL('image/png')
  })
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}
