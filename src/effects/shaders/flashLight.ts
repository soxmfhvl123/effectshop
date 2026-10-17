// Flash Light (Color/Tone)
// A point-and-shoot flash fired straight at the camera at night: a bright
// falloff disc around `center` blows out highlights, everything outside it
// drops to `ambient`, and a hard-edged approximate shadow is cast just
// behind the subject by comparing each pixel's brightness against a
// shifted sample of itself (a real shadow volume isn't needed -- the brief
// asks for "feels like a shadow fell behind them", not a correct one).

export const flashLightVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const flashLightFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uCenter;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uHighlightClip;
  uniform float uAmbient;
  uniform float uContrast;
  uniform float uTemperature;
  uniform vec2 uShadowOffset;
  uniform float uShadowStrength;
  uniform float uGrain;
  uniform float uOpacity;
  varying vec2 vUv;

  float flashLuminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }
  float flashHash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec3 color = srcColor.rgb;

    float dist = distance(vUv, uCenter);
    float mask = 1.0 - smoothstep(0.0, max(uFalloff, 0.001), dist);

    vec3 lit = color * mix(uAmbient, uIntensity, mask);

    float lum = flashLuminance(lit);
    float clipAmt = uHighlightClip * mask;
    lit = mix(lit, vec3(1.0), smoothstep(0.55, 1.1, lum) * clipAmt);

    lit = (lit - 0.5) * uContrast + 0.5;

    float coolShift = -uTemperature;
    lit.b += coolShift * 0.08;
    lit.r -= coolShift * 0.05;

    vec3 neighborColor = texture2D(tDiffuse, clamp(vUv - uShadowOffset, 0.0, 1.0)).rgb;
    float neighborLum = flashLuminance(neighborColor);
    float curLum = flashLuminance(color);
    float shadowMask = clamp(neighborLum - curLum, 0.0, 1.0) * step(curLum, neighborLum);
    lit = mix(lit, lit * (1.0 - uShadowStrength), shadowMask);

    lit += (flashHash(vUv * uResolution + uTime * 60.0) - 0.5) * uGrain;

    vec3 outColor = mix(srcColor.rgb, clamp(lit, 0.0, 1.0), uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
