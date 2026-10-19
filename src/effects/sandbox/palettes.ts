// Curated ink sets for the palette control's "New colors" button. Picked to
// suit flat generative work: riso-ish primaries, neon-on-dark, pastels,
// two-tone op-art pairs. A shuffle takes one of these and resizes it to the
// tool's current ink count, so a 2-ink stripe tool stays two-tone.
export const CURATED_PALETTES: string[][] = [
  ['#0b1712', '#3fe08f', '#e3337a', '#86d6ff', '#ffffff'],
  ['#ff5ad8', '#a05aff', '#5fe0d0', '#f5f06a', '#7af07a', '#ff9fd0'],
  ['#f0a0c4', '#ffd24a', '#ff7aa0', '#f6c89a', '#e86aa6'],
  ['#08081e', '#3a4cff', '#8fa0ff', '#ffffff', '#ff6aa0'],
  ['#111111', '#ff8a2a', '#5fd8ff', '#2a5aff', '#f2f2f2'],
  ['#fbf6f0', '#e8402a', '#f08a2a', '#c42a2a'],
  ['#b6ff3a', '#ff4a2a', '#1a1a3a', '#f2f0e0', '#ff4fd8'],
  ['#0d3a20', '#1f7a45', '#49c28a', '#9fe8c8', '#3a6fd6', '#e9fff3'],
  ['#211866', '#4628b0', '#7c5ad8', '#c8ff48', '#98ff5a', '#e6d0ff'],
  ['#050505', '#2a3cff', '#c43cff', '#ff5a2a', '#ffc83a', '#ffffff'],
  ['#f4efe4', '#1f2a6e', '#e03af0', '#d8f03a', '#5ff0c0'],
  ['#132820', '#7dd6e8', '#f07a8a', '#c9425d'],
  ['#0b0b0b', '#f0602a', '#f2e6d8', '#2fa07a'],
  ['#6a2a9a', '#9ae05a', '#f5f07a', '#111111'],
  ['#e0d4d4', '#f0306a', '#111111', '#3a7af0'],
  ['#3a7af0', '#f0a03a', '#5ff07a', '#e03af0', '#ffffff', '#111111'],
  ['#0f3a3a', '#5fd8f0', '#e05a6a', '#d8703a', '#f2ecd8'],
  ['#d6ead0', '#5a2ab0', '#c8a03a', '#f2ecd8', '#8a5ad0'],
  ['#1b1b20', '#2e1f6e', '#6a49ff', '#46b4ff', '#55f0c0', '#eee6ff'],
  ['#2b1d10', '#d9c45a', '#8fc59a', '#c6e6b8', '#e8604a'],
  ['#14290f', '#3c7af0', '#f2ece2', '#ffcc33'],
  ['#5a1a4a', '#5ff0d8', '#f2f2f2', '#ff6a3a'],
  ['#e8f4e8', '#3d9a38', '#2a6b28', '#f2c0d0'],
  ['#0a0a0a', '#c8c23a', '#ff4f8a', '#5fe0ff'],
  ['#7a2cff', '#ff4fd8', '#ff3b5c', '#ff9f3a', '#9df05a', '#5fd0ff', '#f2f2f2'],
  ['#f2e8c8', '#b8ea6a', '#e9c86a', '#78d86a', '#111111'],
  ['#0a0a0a', '#5a1a2a', '#ff5a3a', '#ffb03a', '#ff6ad8', '#fff0c0'],
  ['#163626', '#2c66ff', '#8a6bff', '#ff4fd8', '#e83cff'],
  ['#cfe3f5', '#1f2a6e', '#9ec3e8', '#ff8a5a'],
  ['#f5f07a', '#111111', '#9a8af0', '#f2e0b0', '#c0c8f0'],
  ['#111111', '#f4f4f4', '#9dff3a', '#6fd62a'],
  ['#3a9af0', '#3a8a5a', '#111111', '#ff5a8a', '#f2c0d0', '#8a5aff'],
]

export function parsePalette(value: unknown, fallback: string[]): string[] {
  if (typeof value !== 'string') return fallback
  const colors = value.split(',').map((c) => c.trim()).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
  return colors.length > 0 ? colors : fallback
}

export function shufflePalette(currentCount: number, current: string[]): string[] {
  const candidates = CURATED_PALETTES.filter((p) => p.join(',') !== current.join(','))
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  // Rotate the pick randomly so the same set doesn't always land the same
  // ink in the background slot.
  const start = Math.floor(Math.random() * pick.length)
  const rotated = [...pick.slice(start), ...pick.slice(0, start)]
  return Array.from({ length: currentCount }, (_, i) => rotated[i % rotated.length])
}

export function rotatePalette(colors: string[]): string[] {
  return colors.length < 2 ? colors : [...colors.slice(1), colors[0]]
}
