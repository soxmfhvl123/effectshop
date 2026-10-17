// Datamosh (Glitch)
// Mimics broken video-compression motion vectors: the frame is divided into
// blocks, a random subset of them (chosen by hashing the block id, so the
// pattern is stable rather than re-rolled every pixel) get displaced and
// smeared along a "motion" direction, with a bit of chroma bleed and color
// quantization layered in. Direction defaults to each block's own
// brightness gradient (a real motion-estimation glitch misapplies a
// neighboring block's motion vector; following the local gradient is the
// cheap single-pass approximation of that).

export const datamoshVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const datamoshFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uBlockSize;
  uniform float uAmount;
  uniform float uDisplacement;
  uniform float uSmear;
  uniform float uDirection; // 0 = Motion, 1 = Horizontal, 2 = Vertical, 3 = Random
  uniform float uChromaBleed;
  uniform float uQuantize;
  uniform float uSeed;
  uniform float uAnimate; // 0 or 1
  uniform float uSpeed;
  uniform float uOpacity;
  varying vec2 vUv;

  float dmHash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 12543.231);
  }
  float dmLuminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;
    float blockSize = max(uBlockSize, 2.0);
    vec2 blockId = floor(px / blockSize);

    float seed = uSeed + (uAnimate > 0.5 ? floor(uTime * uSpeed) : 0.0);
    float r = dmHash(blockId + seed);

    if (r >= uAmount) {
      gl_FragColor = srcColor;
      return;
    }

    vec2 texel = 1.0 / uResolution;
    vec2 blockCenterPx = (blockId + 0.5) * blockSize;

    vec2 dir;
    if (uDirection < 0.5) {
      // Motion: brightness gradient at the block's center only (4 taps,
      // shared in spirit by every pixel in the block) rather than a full
      // per-pixel 3x3 Sobel -- keeps the sample budget low.
      float lR = dmLuminance(texture2D(tDiffuse, (blockCenterPx + vec2(2.0, 0.0)) * texel).rgb);
      float lL = dmLuminance(texture2D(tDiffuse, (blockCenterPx - vec2(2.0, 0.0)) * texel).rgb);
      float lD = dmLuminance(texture2D(tDiffuse, (blockCenterPx + vec2(0.0, 2.0)) * texel).rgb);
      float lU = dmLuminance(texture2D(tDiffuse, (blockCenterPx - vec2(0.0, 2.0)) * texel).rgb);
      dir = vec2(lR - lL, lD - lU);
      dir = length(dir) < 0.001 ? vec2(1.0, 0.0) : normalize(dir);
    } else if (uDirection < 1.5) {
      dir = vec2(1.0, 0.0);
    } else if (uDirection < 2.5) {
      dir = vec2(0.0, 1.0);
    } else {
      float angle = dmHash(blockId + seed + 7.0) * 6.28318;
      dir = vec2(cos(angle), sin(angle));
    }

    vec2 sampleUv = vUv + dir * uDisplacement;

    // Smear: pull the sample toward the block's trailing edge so it drags.
    vec2 edgeUv = (blockCenterPx - dir * blockSize * 0.5) * texel;
    sampleUv = mix(sampleUv, edgeUv, uSmear);
    sampleUv = clamp(sampleUv, 0.0, 1.0);

    vec3 result;
    result.r = texture2D(tDiffuse, clamp(sampleUv + dir * uChromaBleed, 0.0, 1.0)).r;
    result.g = texture2D(tDiffuse, sampleUv).g;
    result.b = texture2D(tDiffuse, clamp(sampleUv - dir * uChromaBleed, 0.0, 1.0)).b;

    float levels = mix(32.0, 4.0, uQuantize);
    result = floor(result * levels + 0.5) / levels;

    vec3 outColor = mix(srcColor.rgb, result, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
