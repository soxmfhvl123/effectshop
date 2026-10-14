// Emboss
// Samples the source at two points on either side of a direction vector and
// subtracts them, producing a relief/bump look with mid-gray flat areas.
// uColorAmount blends between the grayscale relief and a colored version.

export const embossVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const embossFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uStrength;    // sample offset in px, 1..8
  uniform float uAngle;       // degrees
  uniform float uColorAmount; // 0 = grayscale relief, 1 = colored
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 dir = vec2(cos(radians(uAngle)), sin(radians(uAngle))) * uStrength / uResolution;
    vec3 c1 = texture2D(tDiffuse, clamp(vUv + dir, 0.0, 1.0)).rgb;
    vec3 c2 = texture2D(tDiffuse, clamp(vUv - dir, 0.0, 1.0)).rgb;
    vec3 relief = (c1 - c2) + vec3(0.5);

    float lum = dot(relief, vec3(0.333));
    vec3 effectColor = mix(vec3(lum), relief, uColorAmount);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
