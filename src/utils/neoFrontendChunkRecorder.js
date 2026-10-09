import { getNeoDeviceHttpBase, neoDebug, neoDebugError, neoDebugWarn, NEO_CHUNK_INTERVAL_MS } from "./neoConsultationUtils";

const DEFAULT_INTERVAL_MS = NEO_CHUNK_INTERVAL_MS;

function pickRecorderMimeType() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  const supports = (type) => {
    try {
      return window.MediaRecorder.isTypeSupported?.(type);
    } catch {
      return false;
    }
  };
  if (supports("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (supports("audio/webm")) return "audio/webm";
  if (supports("audio/mp4")) return "audio/mp4";
  return "";
}

function createRecorder(stream) {
  if (!stream || typeof window === "undefined" || !window.MediaRecorder) {
    return null;
  }
  const mimeType = pickRecorderMimeType();
  try {
    return mimeType
      ? new window.MediaRecorder(stream, { mimeType })
      : new window.MediaRecorder(stream);
  } catch (error) {
    neoDebugError("[frontend-chunk] MediaRecorder init failed", error);
    return null;
  }
}

/**
 * Records audio in the browser and emits ~60s blobs while recording continues.
 * Pattern matches VoiceRecorderCore useAudioChunkRecorder.
 */
export function createNeoFrontendChunkRecorder({
  intervalMs = DEFAULT_INTERVAL_MS,
  onChunk,
  onError,
} = {}) {
  let mediaStream = null;
  let recorder = null;
  let recorderStream = null;
  let segmentChunks = [];
  let segmentStartedAt = 0;
  let segmentTimer = null;
  let chunkIndex = 0;
  let emittedChunks = false;
  let active = false;
  let uploadQueue = Promise.resolve();

  const clearSegmentTimer = () => {
    if (segmentTimer) {
      window.clearTimeout(segmentTimer);
      segmentTimer = null;
    }
  };

  const disposeRecorderStream = () => {
    const chunkStream = recorderStream;
    recorderStream = null;
    if (chunkStream && chunkStream !== mediaStream) {
      chunkStream.getTracks().forEach((track) => track.stop());
    }
  };

  const queueChunk = (audioBlob) => {
    if (!audioBlob?.size || typeof onChunk !== "function") {
      return uploadQueue;
    }
    chunkIndex += 1;
    emittedChunks = true;
    const currentIndex = chunkIndex;
    uploadQueue = uploadQueue
      .then(() => onChunk(audioBlob, currentIndex))
      .catch((error) => {
        neoDebugError("[frontend-chunk] upload failed", { chunkIndex: currentIndex, error });
        onError?.(error);
      });
    return uploadQueue;
  };

  const stopSegment = ({ reason, forceUpload = false, restart = false } = {}) => {
    clearSegmentTimer();
    const currentRecorder = recorder;
    if (!currentRecorder) {
      disposeRecorderStream();
      return Promise.resolve();
    }

    recorder = null;
    return new Promise((resolve) => {
      const startedAt = segmentStartedAt || Date.now();
      const elapsedMs = Math.max(0, Date.now() - startedAt);

      const finish = () => {
        const chunks = segmentChunks;
        segmentChunks = [];
        segmentStartedAt = 0;
        disposeRecorderStream();

        const shouldUpload =
          forceUpload
          || elapsedMs >= intervalMs
          || (emittedChunks && reason === "final" && elapsedMs > 0);

        if (shouldUpload && chunks.length) {
          const type = currentRecorder.mimeType || chunks[0]?.type || "audio/webm";
          const audioBlob = new Blob(chunks, { type });
          if (audioBlob.size > 0) {
            queueChunk(audioBlob);
          }
        }

        if (restart && active && mediaStream) {
          window.setTimeout(() => {
            startSegment();
          }, 0);
        }
        resolve();
      };

      currentRecorder.addEventListener("stop", finish, { once: true });
      try {
        if (currentRecorder.state !== "inactive") {
          currentRecorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
    });
  };

  const startSegment = () => {
    if (!active || !mediaStream || recorder) return;

    const sourceStream = mediaStream;
    const chunkStream =
      typeof sourceStream.clone === "function" ? sourceStream.clone() : sourceStream;
    const nextRecorder = createRecorder(chunkStream);
    if (!nextRecorder) {
      if (chunkStream !== sourceStream) {
        chunkStream.getTracks().forEach((track) => track.stop());
      }
      return;
    }

    recorderStream = chunkStream;
    segmentChunks = [];
    segmentStartedAt = Date.now();
    nextRecorder.ondataavailable = (event) => {
      if (event.data?.size > 0) {
        segmentChunks.push(event.data);
      }
    };

    try {
      nextRecorder.start();
      recorder = nextRecorder;
      segmentTimer = window.setTimeout(() => {
        stopSegment({ reason: "interval", restart: true });
      }, intervalMs);
    } catch (error) {
      neoDebugError("[frontend-chunk] segment start failed", error);
      recorder = null;
      disposeRecorderStream();
      onError?.(error);
    }
  };

  const start = async () => {
    if (active) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      const error = new Error("Microphone capture is not supported in this browser");
      onError?.(error);
      throw error;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      active = true;
      chunkIndex = 0;
      emittedChunks = false;
      neoDebug("[frontend-chunk] started", { intervalMs });
      startSegment();
    } catch (error) {
      neoDebugError("[frontend-chunk] getUserMedia failed", error);
      onError?.(error);
      throw error;
    }
  };

  const stop = async ({ flushFinal = true } = {}) => {
    if (!active && !mediaStream) return uploadQueue;

    active = false;
    clearSegmentTimer();

    if (recorder) {
      await stopSegment({
        reason: flushFinal ? "final" : "stop",
        forceUpload: flushFinal,
        restart: false,
      });
    }

    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    recorder = null;
    disposeRecorderStream();

    neoDebug("[frontend-chunk] stopped", { chunkIndex });
    return uploadQueue;
  };

  const isActive = () => active;

  return { start, stop, isActive };
}

function readAscii(buffer, offset, length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += String.fromCharCode(new Uint8Array(buffer, offset + i, 1)[0]);
  }
  return out;
}

function parseWavHeader(buffer) {
  if (!buffer || buffer.byteLength < 44) return null;
  if (readAscii(buffer, 0, 4) !== "RIFF" || readAscii(buffer, 8, 4) !== "WAVE") {
    return null;
  }

  const view = new DataView(buffer);
  let offset = 12;
  let sampleRate = 16000;
  let numChannels = 1;
  let bitsPerSample = 16;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readAscii(buffer, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "fmt ") {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === "data") {
      return {
        sampleRate,
        numChannels,
        bitsPerSample,
        dataOffset: offset + 8,
        dataSize: chunkSize,
      };
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

function buildWavFromPcm(pcmBuffer, { sampleRate, numChannels, bitsPerSample }) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = pcmBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Split a WAV blob into fixed-duration segments (e.g. 60s) for transcribe-chunk.
 * Used when the bridge does not expose live partial audio during capture.
 */
export async function splitWavBlobByDuration(blob, segmentDurationSec = 60) {
  if (!blob?.size || segmentDurationSec <= 0) return [];

  const buffer = await blob.arrayBuffer();
  const header = parseWavHeader(buffer);
  if (!header) return [];

  const bytesPerSample = header.bitsPerSample / 8;
  const bytesPerSecond = header.sampleRate * header.numChannels * bytesPerSample;
  const segmentBytes = Math.floor(bytesPerSecond * segmentDurationSec);
  if (!segmentBytes) return [];

  const pcm = buffer.slice(header.dataOffset, header.dataOffset + header.dataSize);
  const segments = [];

  for (let offset = 0; offset < pcm.byteLength; offset += segmentBytes) {
    const slice = pcm.slice(offset, offset + segmentBytes);
    if (slice.byteLength < 500) continue;
    segments.push(
      buildWavFromPcm(slice, {
        sampleRate: header.sampleRate,
        numChannels: header.numChannels,
        bitsPerSample: header.bitsPerSample,
      })
    );
  }

  return segments;
}

/**
 * Extract only newly appended bytes from a growing in-progress WAV file.
 * ws_server.py streams PCM into recordings/current.wav while capture runs.
 */
export async function extractGrowingWavDelta(blob, previousTotalBytes = 0) {
  if (!blob?.size) return null;

  const buffer = await blob.arrayBuffer();
  const minGrowthBytes = 500;
  if (buffer.byteLength <= previousTotalBytes + minGrowthBytes) {
    return null;
  }

  const header = parseWavHeader(buffer);
  if (!header) return null;

  if (previousTotalBytes <= 0) {
    return blob;
  }

  const deltaPcm = buffer.slice(previousTotalBytes);
  if (deltaPcm.byteLength < minGrowthBytes) {
    return null;
  }

  return buildWavFromPcm(deltaPcm, header);
}

export async function fetchPartialDeviceRecording({ liveOnly = false } = {}) {
  const base = getNeoDeviceHttpBase();
  const candidates = liveOnly
    ? [
        `${base}/recordings/current.wav`,
        `${base}/recording/in_progress`,
        `${base}/recordings/in_progress`,
        `${base}/recording/partial`,
      ]
    : [
        `${base}/recordings/current.wav`,
        `${base}/recording/in_progress`,
        `${base}/recordings/in_progress`,
        `${base}/recording/partial`,
      ];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        neoDebug("[frontend-chunk] partial fetch skipped", {
          url,
          status: response.status,
          liveOnly,
        });
        continue;
      }
      const blob = await response.blob();
      if (blob.size > 500) {
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO partial]%c ${url} → ${blob.size} bytes`,
          "background:#7c3aed;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#7c3aed"
        );
        neoDebug("[frontend-chunk] partial device recording", { url, size: blob.size, liveOnly });
        return { blob, url };
      }
      neoDebug("[frontend-chunk] partial too small", { url, size: blob.size, liveOnly });
    } catch (error) {
      neoDebugWarn("[frontend-chunk] partial fetch failed", { url, error, liveOnly });
    }
  }
  return null;
}
