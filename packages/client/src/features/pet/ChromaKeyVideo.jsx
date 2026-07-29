import { useEffect, useRef, useState } from 'react';

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
  varying vec2 v_texCoord;

  void main() {
    vec4 source = texture2D(u_texture, v_texCoord);
    float maxRB = max(source.r, source.b);
    float greenDominance = source.g - maxRB;
    float greenBrightness = smoothstep(0.30, 0.68, source.g);
    float keyMask = smoothstep(0.10, 0.39, greenDominance) * greenBrightness;
    float edgeSpill = smoothstep(0.02, 0.24, greenDominance) * greenBrightness;

    vec3 color = source.rgb;
    color.g = mix(color.g, maxRB * 0.74, edgeSpill * 0.96);
    float alpha = 1.0 - keyMask;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

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

function createWebGlRenderer(canvas, video) {
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
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}

function createCanvasRenderer(canvas, video) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  return () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const maxRB = Math.max(red, blue);
      const dominance = green - maxRB;
      const brightness = Math.max(0, Math.min(1, (green - .3) / .38));
      const mask = Math.max(0, Math.min(1, (dominance - .1) / .29)) * brightness;
      const spill = Math.max(0, Math.min(1, (dominance - .02) / .22)) * brightness;
      pixels[index + 1] = Math.round(green * (1 - spill) * 255 + maxRB * .74 * spill * 255);
      pixels[index + 3] = Math.round((1 - mask) * 255);
    }

    context.putImageData(frame, 0, 0);
  };
}

const SLEEP_LOOP_SECONDS = 2;
const VIDEO_END_EPSILON = 0.06;

export function ChromaKeyVideo({
  src,
  sleepSrc,
  wakeSrc,
  fallbackSrc,
  label = 'Герой',
  aspectRatio = 1,
  sleeping = false,
  className = '',
}) {
  const [videoReady, setVideoReady] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const phaseRef = useRef('idle');
  const previousSleepingRef = useRef(null);
  const playbackTickRef = useRef(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return undefined;

    let cancelFrame = () => {};
    let renderer;

    const render = () => {
      if (!renderer || video.readyState < 2 || video.paused || video.ended) return;
      renderer();
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
      renderer ||= createWebGlRenderer(canvas, video) || createCanvasRenderer(canvas, video);
      if (!renderer) return;
      render();
      setVideoReady(true);
    };

    video.addEventListener('playing', start);

    return () => {
      cancelFrame();
      video.removeEventListener('playing', start);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    setVideoReady(false);

    const switchClip = (nextSrc, phase, shouldLoop = false) => {
      if (!nextSrc) return;
      phaseRef.current = phase;
      video.loop = shouldLoop;

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
