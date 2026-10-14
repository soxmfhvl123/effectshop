// Tilt-Shift Blur
// Keeps a horizontal band around uFocusPosition sharp and blurs everything
// outside it with a 3x3 box blur scaled by distance from the band, faking a
// shallow depth-of-field / miniature-scene look.

export const tiltShiftVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const tiltShiftFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uFocusPosition; // 0..1, vertical center of sharp band
  uniform float uFocusWidth;    // 0..1, band width
  uniform float uBlurAmount;    // px, 0..20
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    float dist = abs(vUv.y - uFocusPosition);
    float blurFactor = smoothstep(uFocusWidth * 0.5, uFocusWidth * 0.5 + 0.25, dist);

    vec2 texel = uBlurAmount * blurFactor / uResolution;
    vec3 sum = vec3(0.0);
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 offset = texel * vec2(float(x), float(y));
        sum += texture2D(tDiffuse, clamp(vUv + offset, 0.0, 1.0)).rgb;
      }
    }
    vec3 effectColor = sum / 9.0;

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
