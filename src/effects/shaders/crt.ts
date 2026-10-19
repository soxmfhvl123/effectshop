// CRT Screen / Scanlines
// Barrel-distorts UVs for tube curvature, darkens out-of-bounds pixels after
// distortion, overlays a sine-wave scanline pattern, and applies a radial
// vignette. Rolling Bar sends a soft bright band down the tube (with a little
// horizontal tear inside it) and Flicker dips the brightness at random, both
// driven by uTime so they move on a still image too. uOpacity blends the
// whole effect back against the untouched input.

export const crtVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const crtFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uCurvature;        // 0..1
  uniform float uScanlineCount;    // 50..500
  uniform float uScanlineIntensity;// 0..1
  uniform float uVignette;         // 0..1
  uniform float uRoll;             // 0..1
  uniform float uFlicker;          // 0..1
  uniform float uTime;
  uniform float uOpacity;          // 0..1
  varying vec2 vUv;

  float crtHash(float n) { return fract(sin(n * 78.233) * 43758.5453); }

  vec2 barrelDistort(vec2 uv, float amount) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc) * amount * 1.4;
    return uv + cc * dist;
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 uv = barrelDistort(vUv, uCurvature);
    // the rolling bar: distance (wrapping) from a band that drifts down the screen
    float barD = abs(fract(uv.y + uTime * 0.11) - 0.5);
    float bar = smoothstep(0.12, 0.0, barD) * uRoll;
    uv.x += bar * 0.006 * sin(uv.y * 160.0 + uTime * 9.0);

    vec3 effectColor;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      effectColor = vec3(0.0);
    } else {
      vec4 color = texture2D(tDiffuse, uv);

      float scan = sin(uv.y * uScanlineCount * 3.14159265);
      scan = 0.5 + 0.5 * scan;
      color.rgb *= 1.0 - uScanlineIntensity * (1.0 - scan);

      vec2 vig = uv * (1.0 - uv.yx);
      float vigAmt = clamp(vig.x * vig.y * 18.0, 0.0, 1.0);
      vigAmt = pow(vigAmt, mix(0.0, 1.0, uVignette));
      color.rgb *= mix(1.0, vigAmt, uVignette);

      color.rgb *= 1.0 + bar * 0.35;
      color.rgb *= 1.0 - uFlicker * 0.22 * crtHash(floor(uTime * 24.0));
      effectColor = color.rgb;
    }

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
