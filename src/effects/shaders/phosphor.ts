// Phosphor Monitor (Retro Display)
// A single-color monochrome CRT look: luminance is stepped down to a small
// number of levels and remapped onto one phosphor color, bright areas bloom
// outward (a cheap single-pass circular-tap glow, not a separate blur pass
// -- keeping 60fps the priority per spec), horizontal scanlines are drawn
// analytically, and a slow uTime-driven flicker varies overall brightness.

export const phosphorVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const phosphorFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uPhosphorColor;
  uniform float uLevels;
  uniform float uBrightness;
  uniform float uGlowRadius;
  uniform float uGlowStrength;
  uniform float uScanlines;
  uniform float uFlicker;
  uniform vec3 uBlackLevel;
  uniform float uOpacity;
  varying vec2 vUv;

  const int GLOW_TAPS = 12;

  float calcLuminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  float phosphorHash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 texel = 1.0 / uResolution;

    float lum = calcLuminance(srcColor.rgb) * uBrightness;

    // Cheap bloom: average a ring of taps around this pixel and add the
    // bright ones back in, instead of a real separable blur pass.
    float glow = 0.0;
    for (int i = 0; i < GLOW_TAPS; i++) {
      float angle = (float(i) / float(GLOW_TAPS)) * 6.28318;
      vec2 offset = vec2(cos(angle), sin(angle)) * uGlowRadius * texel;
      float sampleLum = calcLuminance(texture2D(tDiffuse, clamp(vUv + offset, 0.0, 1.0)).rgb);
      glow += max(0.0, sampleLum - 0.55);
    }
    glow = (glow / float(GLOW_TAPS)) * uGlowStrength;

    float levels = max(uLevels, 2.0);
    float stepped = floor(clamp(lum + glow, 0.0, 1.0) * levels + 0.5) / levels;

    float scanline = 1.0 - uScanlines * 0.5 * (0.5 + 0.5 * sin(vUv.y * uResolution.y * 3.14159265));
    float flickerAmt = 1.0 + (phosphorHash(vec2(floor(uTime * 12.0), 0.0)) - 0.5) * uFlicker;

    vec3 phosphorScreen = mix(uBlackLevel, uPhosphorColor, clamp(stepped, 0.0, 1.0));
    vec3 effectColor = phosphorScreen * scanline * flickerAmt;

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
