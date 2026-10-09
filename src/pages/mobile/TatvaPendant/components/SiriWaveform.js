import React, { useEffect, useRef } from 'react';
import './SiriWaveform.scss';

/**
 * Siri-style ribbon visualizer — same analyser config and bezier geometry as
 * the desktop VoiceRxSiriWaveform, only with white-only colors. When a
 * MediaStream is passed via `stream`, frequency data drives the wave; without
 * a stream we fall back to a subtle synthetic envelope while `active`.
 */

const opts = {
  smoothing: 0.65,
  fft: 8,
  minDecibels: -60,
  glow: 40,
  color1: [255, 255, 255],
  color2: [255, 255, 255],
  color3: [255, 255, 255],
  fillOpacity: 0.3,
  lineWidth: 0,
  blend: 'lighter',
  shift: 35,
  width: 50,
  amp: 0.35,
};

const shuffle = [1, 3, 0, 4, 2];

function range(n) {
  return Array.from(Array(n).keys());
}

function pickFreq(channel, i, freqs) {
  const band = 2 * channel + shuffle[i] * 6;
  return freqs[band] ?? 0;
}

function ampScale(i) {
  const x = Math.abs(2 - i);
  const s = 3 - x;
  return (s / 3) * opts.amp;
}

function drawChannelPath(ctx, channel, WIDTH, HEIGHT, freqs) {
  const color = channel === 0
    ? opts.color1
    : channel === 1 ? opts.color2 : opts.color3;

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  gradient.addColorStop(0.06, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opts.fillOpacity})`);
  gradient.addColorStop(0.94, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opts.fillOpacity})`);
  gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

  ctx.fillStyle = gradient;
  ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
  ctx.lineWidth = opts.lineWidth;
  ctx.shadowBlur = opts.glow;
  ctx.globalCompositeOperation = opts.blend;

  const m = HEIGHT / 2;
  const offset = (WIDTH - 15 * opts.width) / 2;
  const x = range(15).map((i) => offset + channel * opts.shift + i * opts.width);
  const y = range(5).map(
    (i) => Math.max(0, m - ampScale(i) * pickFreq(channel, i, freqs)),
  );
  const h = 2 * m;

  ctx.beginPath();
  ctx.moveTo(0, m);
  ctx.lineTo(x[0], m + 1);

  ctx.bezierCurveTo(x[1], m + 1, x[2], y[0], x[3], y[0]);
  ctx.bezierCurveTo(x[4], y[0], x[4], y[1], x[5], y[1]);
  ctx.bezierCurveTo(x[6], y[1], x[6], y[2], x[7], y[2]);
  ctx.bezierCurveTo(x[8], y[2], x[8], y[3], x[9], y[3]);
  ctx.bezierCurveTo(x[10], y[3], x[10], y[4], x[11], y[4]);

  ctx.bezierCurveTo(x[12], y[4], x[12], m, x[13], m);
  ctx.lineTo(WIDTH, m + 1);
  ctx.lineTo(x[13], m - 1);

  ctx.bezierCurveTo(x[12], m, x[12], h - y[4], x[11], h - y[4]);
  ctx.bezierCurveTo(x[10], h - y[4], x[10], h - y[3], x[9], h - y[3]);
  ctx.bezierCurveTo(x[8], h - y[3], x[8], h - y[2], x[7], h - y[2]);
  ctx.bezierCurveTo(x[6], h - y[2], x[6], h - y[1], x[5], h - y[1]);
  ctx.bezierCurveTo(x[4], h - y[1], x[4], h - y[0], x[3], h - y[0]);
  ctx.bezierCurveTo(x[2], h - y[0], x[1], m, x[0], m);

  ctx.lineTo(0, m);
  ctx.fill();
}

function drawIdleLine(ctx, WIDTH, HEIGHT) {
  const m = HEIGHT / 2;
  const pad = Math.min(16, WIDTH * 0.06);
  const grad = ctx.createLinearGradient(pad, m, WIDTH - pad, m);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.0;
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(pad, m);
  ctx.lineTo(WIDTH - pad, m);
  ctx.stroke();
}

function SiriWaveform({ active = false, stream = null, className = '' }) {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const freqsRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const cleanup = () => {
      try { sourceRef.current?.disconnect(); } catch (e) { /* noop */ }
      try { audioCtxRef.current?.close(); } catch (e) { /* noop */ }
      sourceRef.current = null;
      audioCtxRef.current = null;
      analyserRef.current = null;
      freqsRef.current = null;
    };

    cleanup();
    if (!stream || typeof window === 'undefined') return cleanup;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return cleanup;

    try {
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.smoothingTimeConstant = opts.smoothing;
      analyser.fftSize = 2 ** opts.fft;
      analyser.minDecibels = opts.minDecibels;
      analyser.maxDecibels = 0;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = src;
      freqsRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      cleanup();
    }
    return cleanup;
  }, [stream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return undefined;

    let raf;
    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
      const logicalW = Math.max(80, Math.floor(rect.width));
      const logicalH = Math.max(40, Math.floor(rect.height));
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, logicalW, logicalH);

      const analyser = analyserRef.current;
      const freqs = freqsRef.current;

      if (analyser && freqs && stream && active) {
        analyser.getByteFrequencyData(freqs);
        const hasAudio = freqs.some((v) => v > 0);
        if (hasAudio) {
          ctx2d.globalCompositeOperation = 'source-over';
          drawChannelPath(ctx2d, 0, logicalW, logicalH, freqs);
          drawChannelPath(ctx2d, 1, logicalW, logicalH, freqs);
          drawChannelPath(ctx2d, 2, logicalW, logicalH, freqs);
        } else {
          drawIdleLine(ctx2d, logicalW, logicalH);
        }
      } else {
        // No mic stream or paused — never auto-wobble; show the idle line.
        drawIdleLine(ctx2d, logicalW, logicalH);
      }

      raf = requestAnimationFrame(tick);
      rafRef.current = raf;
    };
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, stream]);

  return (
    <div className={`tp-siri-wave ${active ? 'tp-siri-wave--active' : ''} ${className}`}>
      <canvas ref={canvasRef} className="tp-siri-wave__canvas" aria-hidden />
    </div>
  );
}

export default SiriWaveform;
