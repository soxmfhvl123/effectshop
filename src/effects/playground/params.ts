import type { PlaygroundParam } from './types'

export const slider = (id: string, name: string, value: number, min: number, max: number, step = 0.01): PlaygroundParam => ({
  id,
  name,
  type: 'slider',
  value,
  min,
  max,
  step,
})

export const toggle = (id: string, name: string, value: boolean): PlaygroundParam => ({ id, name, type: 'toggle', value })

export const select = (id: string, name: string, labels: string[], value = labels[0]): PlaygroundParam => ({
  id,
  name,
  type: 'select',
  value,
  options: labels.map((l) => ({ label: l, value: l })),
})
