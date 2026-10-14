// CRT Screen / Scanlines
// Barrel-distorts UVs for tube curvature, darkens out-of-bounds pixels after
// distortion, overlays a sine-wave scanline pattern, and applies a radial
// vignette. uOpacity blends the whole effect back against the untouched input.

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
  uniform float uOpacity;          // 0..1
  varying vec2 vUv;

  vec2 barrelDistort(vec2 uv, float amount) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc) * amount * 1.4;
    return uv + cc * dist;
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 uv = barrelDistort(vUv, uCurvature);

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

      effectColor = color.rgb;
    }

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
