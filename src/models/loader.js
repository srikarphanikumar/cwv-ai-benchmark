import { pipeline, env, RawImage } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

const _pipelines = new Map();

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

function isRetryableError(err) {
  const msg = err?.message ?? '';
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('Service Unavailable') ||
    msg.includes('Bad Gateway') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network error') ||
    msg.includes('Load failed')
  );
}

async function withRetry(fn, maxRetries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryableError(err) || attempt === maxRetries) throw err;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function loadModel(modelConfig, dtype, onProgress) {
  const { id, task, modelId } = modelConfig;

  if (_pipelines.has(id)) {
    onProgress?.({ status: 'cached', progress: 100 });
    return _pipelines.get(id);
  }

  const pipe = await withRetry(() =>
    pipeline(task, modelId, {
      dtype,
      progress_callback: (info) => {
        onProgress?.(info);
      },
    }),
  );

  _pipelines.set(id, pipe);
  return pipe;
}

export async function runInference(modelConfig, pipe) {
  const { task, inputType } = modelConfig;

  switch (inputType) {
    case 'text': {
      const text =
        'Benchmarking client-side AI inference and its impact on Core Web Vitals ' +
        'including Interaction to Next Paint, Total Blocking Time, and Largest Contentful Paint.';
      if (task === 'feature-extraction') {
        return await pipe(text, { pooling: 'mean', normalize: true });
      }
      return await pipe(text);
    }

    case 'audio': {
      const audio = generateSineWave(16000, 2);
      return await pipe(audio, { sampling_rate: 16000 });
    }

    case 'image': {
      const canvas = generateTestImage(224, 224);
      const image = await RawImage.fromCanvas(canvas);
      return await pipe(image);
    }

    default:
      throw new Error(`Unknown input type: ${inputType}`);
  }
}

export function isPipelineCached(id) {
  return _pipelines.has(id);
}

export function clearPipelineCache() {
  _pipelines.clear();
}

function generateSineWave(sampleRate, durationSecs) {
  const samples = sampleRate * durationSecs;
  const audio = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    audio[i] =
      0.3 * Math.sin(2 * Math.PI * 440 * (i / sampleRate)) +
      0.2 * Math.sin(2 * Math.PI * 880 * (i / sampleRate));
  }
  return audio;
}

function generateTestImage(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#667eea');
  g.addColorStop(0.5, '#764ba2');
  g.addColorStop(1, '#f093fb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.4, width * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,200,0,0.7)';
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.6, width * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,220,180,0.5)';
  ctx.fillRect(width * 0.2, height * 0.6, width * 0.2, height * 0.2);

  return canvas;
}
