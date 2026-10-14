import type { Preset } from '../types/effect'

// All five PRD presets are buildable. "Thermal Scan" uses the Duotone effect
// (a real luminance -> color-ramp remap) for a true false-color/heatmap look,
// rather than the earlier Film Grain + CRT tint approximation.
export const PRESETS: Preset[] = [
  {
    id: 'riso-zine',
    name: 'Riso Zine',
    description: 'Bold rotated halftone, ink-on-paper look.',
    implemented: true,
    effects: [
      {
        effectId: 'halftone',
        name: 'Halftone Screen',
        enabled: true,
        opacity: 1,
        parameters: { scale: 6, angle: 15, contrast: 1.4, blendMode: 'multiply' },
      },
    ],
  },
  {
    id: 'retro-crt',
    name: 'Retro CRT',
    description: 'Curved tube, heavy scanlines, dark vignette.',
    implemented: true,
    effects: [
      {
        effectId: 'crt',
        name: 'CRT Screen',
        enabled: true,
        opacity: 1,
        parameters: { curvature: 0.35, scanlineCount: 320, scanlineIntensity: 0.55, vignette: 0.6 },
      },
    ],
  },
  {
    id: '90s-cyberpunk',
    name: '90s Cyberpunk',
    description: 'Neon dither palette with a chromatic-aberration split.',
    implemented: true,
    effects: [
      {
        effectId: 'dither',
        name: 'Dither',
        enabled: true,
        opacity: 1,
        parameters: { type: 'bayer4', palette: 'cyberpunk', scale: 3 },
      },
      {
        effectId: 'rgbShift',
        name: 'RGB Shift',
        enabled: true,
        opacity: 0.8,
        parameters: { amount: 6, angle: 0, radialDistortion: false },
      },
    ],
  },
  {
    id: 'gameboy-noir',
    name: 'Gameboy Noir',
    description: 'Classic 4-shade handheld dither.',
    implemented: true,
    effects: [
      {
        effectId: 'dither',
        name: 'Dither',
        enabled: true,
        opacity: 1,
        parameters: { type: '2bit', palette: 'gameboy', scale: 3 },
      },
    ],
  },
  {
    id: 'thermal-scan',
    name: 'Thermal Scan',
    description: 'False-color heatmap gradient with CRT scanlines.',
    implemented: true,
    effects: [
      {
        effectId: 'duotone',
        name: 'Duotone',
        enabled: true,
        opacity: 1,
        parameters: { shadowColor: '#0a0033', highlightColor: '#ff3d1a', contrast: 1.3 },
      },
      {
        effectId: 'crt',
        name: 'CRT Screen',
        enabled: true,
        opacity: 0.6,
        parameters: { curvature: 0.1, scanlineCount: 180, scanlineIntensity: 0.4, vignette: 0.5 },
      },
    ],
  },
  {
    id: 'touchdesigner',
    name: 'TouchDesigner',
    description: 'Neon duotone base, an object-masked point cloud, and a reactive flow field.',
    implemented: true,
    effects: [
      {
        effectId: 'duotone',
        name: 'Duotone',
        enabled: true,
        opacity: 0.7,
        parameters: { shadowColor: '#05000f', highlightColor: '#4d4dff', contrast: 1.1 },
      },
      {
        effectId: 'pointCloud',
        name: 'Point Cloud',
        enabled: true,
        opacity: 1,
        parameters: {
          keyColor: '#05000f',
          threshold: 0.28,
          spacing: 10,
          dotSize: 3,
          jitter: 0.5,
          useSourceColor: false,
          dotColor: '#00ffc8',
        },
      },
      {
        effectId: 'flowField',
        name: 'Flow Field',
        enabled: true,
        opacity: 0.55,
        parameters: {
          spacing: 14,
          lineLength: 8,
          thickness: 1,
          noiseScale: 0.1,
          speed: 0.6,
          luminanceReactive: true,
          lineColor: '#ff2bd6',
        },
      },
    ],
  },
]
