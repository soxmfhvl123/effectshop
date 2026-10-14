// Paper Cutout (Generate)
// Posterizes the image into flat color bands, draws a bold outline at band
// boundaries, and blends in a second outline sampled from an offset position
// behind the main one — a cheap stand-in for a drop-shadow paper layer
// peeking out from under a cutout shape, without true subject segmentation.

export const paperCutoutVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const paperCutoutFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uLevels;  // posterize levels, 2..8
  uniform float uOffset;  // shadow layer offset, px
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  varying vec2 vUv;

  vec3 posterizeAt(vec2 uv) {
    vec3 c = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
    return floor(c * uLevels + 0.5) / max(uLevels - 1.0, 1.0);
  }

  float edgeAt(vec2 uv, vec2 texel) {
    vec3 c = posterizeAt(uv);
    vec3 x = posterizeAt(uv + vec2(texel.x * 1.5, 0.0));
    vec3 y = posterizeAt(uv + vec2(0.0, texel.y * 1.5));
    return step(0.05, length(c - x) + length(c - y));
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 texel = 1.0 / uResolution;

    vec3 posterized = posterizeAt(vUv);
    float edge = edgeAt(vUv, texel);

    vec2 offUv = vUv - vec2(uOffset, -uOffset) * texel;
    float offEdge = edgeAt(offUv, texel);

    vec3 result = posterized;
    result = mix(result, uShadowColor, offEdge * (1.0 - edge) * 0.9);
    result = mix(result, vec3(0.05), edge);

    vec3 outColor = mix(srcColor.rgb, result, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
