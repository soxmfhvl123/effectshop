// Levels (Color/Tone)
// Classic black-point/white-point/gamma remap — stretches the input range
// [blackPoint, whitePoint] to [0, 1] and applies a gamma curve, the same
// three controls as Photoshop/Lightroom's Levels tool.

export const levelsVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const levelsFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uBlackPoint; // 0..1
  uniform float uWhitePoint; // 0..1
  uniform float uGamma;      // 0.1..3
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec3 c = clamp((srcColor.rgb - uBlackPoint) / max(uWhitePoint - uBlackPoint, 0.0001), 0.0, 1.0);
    c = pow(c, vec3(1.0 / uGamma));
    vec3 outColor = mix(srcColor.rgb, c, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
