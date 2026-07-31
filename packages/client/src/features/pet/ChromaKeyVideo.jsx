import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform vec3 u_keyColor;
  uniform vec2 u_texelSize;
  uniform float u_similarity;
  uniform float u_blend;
  varying vec2 v_texCoord;

  float smootherstep(float edgeStart, float edgeEnd, float value) {
    float progress = clamp((value - edgeStart) / max(edgeEnd - edgeStart, 0.0001), 0.0, 1.0);
    return progress * progress * progress * (progress * (progress * 6.0 - 15.0) + 10.0);
  }

  vec3 chromaticity(vec3 color) {
    return color / max(color.r + color.g + color.b, 0.0001);
  }

  float keyMaskAt(vec2 textureCoordinate) {
    vec3 color = texture2D(u_texture, textureCoordinate).rgb;
    float rgbDistance = distance(color, u_keyColor) / 1.7320508;
    float exactMask = 1.0 - smootherstep(
      u_similarity,
      u_similarity + u_blend,
      rgbDistance
    );

    float chromaDistance = distance(chromaticity(color), chromaticity(u_keyColor));
    float chromaStart = u_similarity * 0.45;
    float chromaEnd = chromaStart + max(u_blend, 0.06);
    float hueMask = 1.0 - smootherstep(chromaStart, chromaEnd, chromaDistance);
    float maximum = max(color.r, max(color.g, color.b));
    float minimum = min(color.r, min(color.g, color.b));
    float saturationGate = smootherstep(0.035, 0.16, maximum - minimum);
    float visibilityGate = smootherstep(0.025, 0.12, maximum);

    return max(exactMask, hueMask * saturationGate * visibilityGate);
  }

  void main() {
    vec4 source = texture2D(u_texture, v_texCoord);
    float centerMask = keyMaskAt(v_texCoord);
    float neighborMask =
      keyMaskAt(v_texCoord + vec2(u_texelSize.x, 0.0))
      + keyMaskAt(v_texCoord - vec2(u_texelSize.x, 0.0))
      + keyMaskAt(v_texCoord + vec2(0.0, u_texelSize.y))
      + keyMaskAt(v_texCoord - vec2(0.0, u_texelSize.y));
    float keyMask = smootherstep(0.08, 0.92, centerMask * 0.6 + neighborMask * 0.1);

    float keyMinimum = min(u_keyColor.r, min(u_keyColor.g, u_keyColor.b));
    float keyRange = max(
      max(u_keyColor.r, max(u_keyColor.g, u_keyColor.b)) - keyMinimum,
      0.0001
    );
    vec3 keyWeights = (u_keyColor - vec3(keyMinimum)) / keyRange;
    vec3 otherWeights = vec3(1.0) - keyWeights;
    float neutral = dot(source.rgb, otherWeights)
      / max(otherWeights.r + otherWeights.g + otherWeights.b, 0.0001);
    vec3 neutralized = mix(source.rgb, vec3(neutral), keyWeights);
    float edgeSpill = smootherstep(0.02, 0.98, keyMask) * 0.82;
    vec3 color = mix(source.rgb, neutralized, edgeSpill);
    float alpha = source.a * (1.0 - keyMask);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

const DEFAULT_CHROMA_KEY = [0.33, 0.87, 0.33];
const DEFAULT_SIMILARITY = 0.2;
const DEFAULT_BLEND = 0.08;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function parseChromaKey(chromaKey) {
  if (Array.isArray(chromaKey) && chromaKey.length >= 3) {
    return chromaKey.slice(0, 3).map((channel) => clamp(Number(channel), 0, 1));
  }

  const normalized = String(chromaKey || '').trim().replace(/^#|^0x/i, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [...DEFAULT_CHROMA_KEY];

  return [0, 2, 4].map((offset) => (
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
  ));
}

function chromaticity(red, green, blue) {
  const total = Math.max(red + green + blue, 0.0001);
  return [red / total, green / total, blue / total];
}

export function calculateChromaKeyMask(
  red,
  green,
  blue,
  {
    keyColor = DEFAULT_CHROMA_KEY,
    similarity = DEFAULT_SIMILARITY,
    blend = DEFAULT_BLEND,
  } = {},
) {
  const safeSimilarity = clamp(Number(similarity), 0.01, 1);
  const safeBlend = clamp(Number(blend), 0.001, 1);
  const rgbDistance = Math.hypot(
    red - keyColor[0],
    green - keyColor[1],
    blue - keyColor[2],
  ) / Math.sqrt(3);
  const exactMask = 1 - smootherstep(
    safeSimilarity,
    safeSimilarity + safeBlend,
    rgbDistance,
  );

  const sourceChroma = chromaticity(red, green, blue);
  const keyChroma = chromaticity(...keyColor);
  const chromaDistance = Math.hypot(
    sourceChroma[0] - keyChroma[0],
    sourceChroma[1] - keyChroma[1],
    sourceChroma[2] - keyChroma[2],
  );
  const chromaStart = safeSimilarity * 0.45;
  const chromaEnd = chromaStart + Math.max(safeBlend, 0.06);
  const hueMask = 1 - smootherstep(chromaStart, chromaEnd, chromaDistance);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const saturationGate = smootherstep(0.035, 0.16, maximum - minimum);
  const visibilityGate = smootherstep(0.025, 0.12, maximum);
  return Math.max(
    exactMask,
    hueMask * saturationGate * visibilityGate,
  );
}

function createWebGlRenderer(canvas, video, chromaOptions) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const program = createProgram(gl);
  if (!program) return null;

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0,
  ]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.useProgram(program);
  gl.uniform3f(
    gl.getUniformLocation(program, 'u_keyColor'),
    chromaOptions.keyColor[0],
    chromaOptions.keyColor[1],
    chromaOptions.keyColor[2],
  );
  gl.uniform1f(
    gl.getUniformLocation(program, 'u_similarity'),
    chromaOptions.similarity,
  );
  gl.uniform1f(gl.getUniformLocation(program, 'u_blend'), chromaOptions.blend);
  const texelSizeLocation = gl.getUniformLocation(program, 'u_texelSize');
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);

  return () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(
      texelSizeLocation,
      1 / Math.max(video.videoWidth, canvas.width),
      1 / Math.max(video.videoHeight, canvas.height),
    );
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}

function createCanvasRenderer(canvas, video, chromaOptions) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const keyMinimum = Math.min(...chromaOptions.keyColor);
  const keyRange = Math.max(
    Math.max(...chromaOptions.keyColor) - keyMinimum,
    0.0001,
  );
  const keyWeights = chromaOptions.keyColor.map(
    (channel) => (channel - keyMinimum) / keyRange,
  );
  const otherWeights = keyWeights.map((weight) => 1 - weight);
  const otherWeightTotal = Math.max(
    otherWeights.reduce((sum, weight) => sum + weight, 0),
    0.0001,
  );

  return () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;

    const masks = new Float32Array(canvas.width * canvas.height);

    for (let index = 0, pixelIndex = 0; index < pixels.length; index += 4, pixelIndex += 1) {
      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      masks[pixelIndex] = calculateChromaKeyMask(
        red,
        green,
        blue,
        chromaOptions,
      );
    }

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const pixelIndex = y * canvas.width + x;
        const index = pixelIndex * 4;
        const left = masks[y * canvas.width + Math.max(0, x - 1)];
        const right = masks[y * canvas.width + Math.min(canvas.width - 1, x + 1)];
        const top = masks[Math.max(0, y - 1) * canvas.width + x];
        const bottom = masks[Math.min(canvas.height - 1, y + 1) * canvas.width + x];
        const mask = smootherstep(
          0.08,
          0.92,
          masks[pixelIndex] * 0.6 + (left + right + top + bottom) * 0.1,
        );
        const red = pixels[index] / 255;
        const green = pixels[index + 1] / 255;
        const blue = pixels[index + 2] / 255;
        const channels = [red, green, blue];
        const neutral = channels.reduce(
          (sum, channel, channelIndex) => (
            sum + channel * otherWeights[channelIndex]
          ),
          0,
        ) / otherWeightTotal;
        const spill = smootherstep(0.02, 0.98, mask) * 0.82;
        const sourceAlpha = pixels[index + 3] / 255;

        for (let channelIndex = 0; channelIndex < 3; channelIndex += 1) {
          const neutralized = channels[channelIndex] * (1 - keyWeights[channelIndex])
            + neutral * keyWeights[channelIndex];
          pixels[index + channelIndex] = Math.round(
            (channels[channelIndex] * (1 - spill) + neutralized * spill) * 255,
          );
        }
        pixels[index + 3] = Math.round(sourceAlpha * (1 - mask) * 255);
      }
    }

    context.putImageData(frame, 0, 0);
  };
}

const SLEEP_LOOP_SECONDS = 2;
const VIDEO_END_EPSILON = 0.06;
const GROUND_SAMPLE_SIZE = 96;
const GROUND_SCAN_LIMIT = 18;
const GROUND_SCAN_INTERVAL = 3;
const GROUND_TARGET_RATIO = 0.97;
const MAX_GROUND_SHIFT_RATIO = 0.3;

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

const smootherstep = (edgeStart, edgeEnd, value) => {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return progress ** 3 * (progress * (progress * 6 - 15) + 10);
};

export function findCharacterGroundRatio(pixels, width, height, chromaOptions = {}) {
  if (!pixels || width <= 0 || height <= 0) return 1;

  const options = {
    keyColor: chromaOptions.keyColor || DEFAULT_CHROMA_KEY,
    similarity: chromaOptions.similarity ?? DEFAULT_SIMILARITY,
    blend: chromaOptions.blend ?? DEFAULT_BLEND,
  };
  const left = Math.floor(width * 0.06);
  const right = Math.ceil(width * 0.94);
  const minimumForegroundPixels = Math.max(2, Math.round((right - left) * 0.025));

  for (let y = height - 1; y >= 0; y -= 1) {
    let foregroundPixels = 0;

    for (let x = left; x < right; x += 1) {
      const index = (y * width + x) * 4;
      const sourceAlpha = pixels[index + 3] / 255;
      if (sourceAlpha < 0.2) continue;

      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const keyMask = calculateChromaKeyMask(red, green, blue, options);
      const keyedAlpha = sourceAlpha * (1 - keyMask);

      if (keyedAlpha >= 0.5) {
        foregroundPixels += 1;
        if (foregroundPixels >= minimumForegroundPixels) {
          return (y + 1) / height;
        }
      }
    }
  }

  return 1;
}

function createGroundDetector(video, onGroundRatioChange, chromaOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = GROUND_SAMPLE_SIZE;
  canvas.height = GROUND_SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let renderedFrames = 0;
  let scannedFrames = 0;
  let deepestGroundRatio = 0;

  const reset = () => {
    renderedFrames = 0;
    scannedFrames = 0;
    deepestGroundRatio = 0;
    onGroundRatioChange(1);
  };

  const measure = () => {
    if (!context || scannedFrames >= GROUND_SCAN_LIMIT || video.readyState < 2) return;
    renderedFrames += 1;
    if ((renderedFrames - 1) % GROUND_SCAN_INTERVAL !== 0) return;

    try {
      context.clearRect(0, 0, GROUND_SAMPLE_SIZE, GROUND_SAMPLE_SIZE);
      context.drawImage(video, 0, 0, GROUND_SAMPLE_SIZE, GROUND_SAMPLE_SIZE);
      const frame = context.getImageData(
        0,
        0,
        GROUND_SAMPLE_SIZE,
        GROUND_SAMPLE_SIZE,
      );
      const groundRatio = findCharacterGroundRatio(
        frame.data,
        GROUND_SAMPLE_SIZE,
        GROUND_SAMPLE_SIZE,
        chromaOptions,
      );
      scannedFrames += 1;

      if (groundRatio > deepestGroundRatio) {
        deepestGroundRatio = groundRatio;
        onGroundRatioChange(deepestGroundRatio);
      }
    } catch {
      scannedFrames = GROUND_SCAN_LIMIT;
      onGroundRatioChange(1);
    }
  };

  return { measure, reset };
}

export function ChromaKeyVideo({
  src,
  sleepSrc,
  wakeSrc,
  fallbackSrc,
  label = 'Герой',
  aspectRatio = 1,
  chromaKey,
  similarity = DEFAULT_SIMILARITY,
  blend = DEFAULT_BLEND,
  sleeping = false,
  className = '',
}) {
  const [videoReady, setVideoReady] = useState(false);
  const characterRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const groundDetectorRef = useRef(null);
  const phaseRef = useRef('idle');
  const previousSleepingRef = useRef(null);
  const playbackTickRef = useRef(() => {});
  const chromaOptions = useMemo(() => ({
    keyColor: parseChromaKey(chromaKey),
    similarity: clamp(Number(similarity), 0.01, 1),
    blend: clamp(Number(blend), 0.001, 1),
  }), [blend, chromaKey, similarity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return undefined;

    let cancelFrame = () => {};
    let renderer;

    const render = () => {
      if (!renderer || video.readyState < 2 || video.paused || video.ended) return;
      renderer();
      groundDetectorRef.current?.measure();
      playbackTickRef.current(video);
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(render);
        cancelFrame = () => video.cancelVideoFrameCallback(id);
      } else {
        const id = requestAnimationFrame(render);
        cancelFrame = () => cancelAnimationFrame(id);
      }
    };

    const start = () => {
      cancelFrame();
      renderer ||= createWebGlRenderer(canvas, video, chromaOptions)
        || createCanvasRenderer(canvas, video, chromaOptions);
      if (!renderer) return;
      groundDetectorRef.current ||= createGroundDetector(
        video,
        (groundRatio) => {
          const groundShift = clamp(
            GROUND_TARGET_RATIO - groundRatio,
            0,
            MAX_GROUND_SHIFT_RATIO,
          );
          characterRef.current?.style.setProperty(
            '--chroma-ground-shift',
            `${groundShift * 100}%`,
          );
        },
        chromaOptions,
      );
      render();
      setVideoReady(true);
    };

    video.addEventListener('playing', start);

    return () => {
      cancelFrame();
      video.removeEventListener('playing', start);
      groundDetectorRef.current = null;
    };
  }, [chromaOptions]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    setVideoReady(false);

    const switchClip = (nextSrc, phase, shouldLoop = false) => {
      if (!nextSrc) return;
      phaseRef.current = phase;
      video.loop = shouldLoop;
      groundDetectorRef.current?.reset();

      if (video.getAttribute('src') !== nextSrc) {
        video.src = nextSrc;
      } else if (video.readyState >= 1) {
        video.currentTime = 0;
      }
    };

    const startSleepLoop = () => {
      if (!Number.isFinite(video.duration)) return;
      phaseRef.current = 'sleep-loop';
      video.currentTime = Math.max(0, video.duration - SLEEP_LOOP_SECONDS);
      const playPromise = video.play();
      playPromise?.catch(() => {});
    };

    const returnToIdle = () => switchClip(src, 'idle', true);

    playbackTickRef.current = (activeVideo) => {
      if (!Number.isFinite(activeVideo.duration)) return;
      const timeRemaining = activeVideo.duration - activeVideo.currentTime;

      if (
        (phaseRef.current === 'sleep-intro' || phaseRef.current === 'sleep-loop')
        && timeRemaining <= VIDEO_END_EPSILON
      ) {
        startSleepLoop();
      } else if (phaseRef.current === 'wake' && timeRemaining <= VIDEO_END_EPSILON) {
        returnToIdle();
      }
    };

    const handleEnded = () => {
      if (phaseRef.current === 'sleep-intro' || phaseRef.current === 'sleep-loop') {
        startSleepLoop();
      } else if (phaseRef.current === 'wake') {
        returnToIdle();
      }
    };

    video.addEventListener('ended', handleEnded);

    const wasSleeping = previousSleepingRef.current;
    if (sleeping) {
      switchClip(sleepSrc, 'sleep-intro');
    } else if (wasSleeping) {
      switchClip(wakeSrc, 'wake');
    } else {
      switchClip(src, 'idle', true);
    }
    previousSleepingRef.current = sleeping;

    return () => {
      video.removeEventListener('ended', handleEnded);
      playbackTickRef.current = () => {};
    };
  }, [sleeping, sleepSrc, src, wakeSrc]);

  return (
    <div
      ref={characterRef}
      className={`chroma-character ${className}`.trim()}
      style={{ '--chroma-aspect': aspectRatio }}
    >
      {fallbackSrc && (
        <img
          className={`chroma-fallback ${videoReady ? 'is-hidden' : ''}`}
          src={fallbackSrc}
          alt=""
          aria-hidden="true"
        />
      )}
      <video ref={videoRef} src={src} muted loop autoPlay playsInline preload="auto" aria-hidden="true" />
      <canvas ref={canvasRef} width="640" height="640" role="img" aria-label={label} />
    </div>
  );
}
