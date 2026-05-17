import { loadModel, runInference, isPipelineCached } from '../models/loader.js';
import { LongTaskObserver } from '../metrics/tbt.js';
import { captureMemory, memoryDelta } from '../metrics/memory.js';
import { captureBundleMetrics } from '../metrics/bundle.js';
import { measureINP } from '../metrics/cwv.js';

export class BenchmarkRunner {
  constructor() {
    this.longTaskObserver = new LongTaskObserver();
    this.results = new Map();
  }

  get tbtSupported() {
    return this.longTaskObserver.supported;
  }

  async runModel(modelConfig, { dtype, iterations, warmup }, callbacks = {}) {
    const { id, name } = modelConfig;
    const { onPhase, onProgress, onComplete } = callbacks;

    const result = {
      id,
      name,
      dtype,
      timestamp: Date.now(),
      cached: isPipelineCached(id),
      loadTime: null,
      warmupTime: null,
      inferenceIterations: [],
      tbt: null,
      longTasks: [],
      memory: null,
      inp: null,
      error: null,
    };

    try {
      window.gc?.();
      const memBefore = captureMemory();

      // --- Load phase ---
      onPhase?.('loading');
      const loadT0 = performance.now();
      const pipe = await loadModel(modelConfig, dtype, (info) => {
        onProgress?.(info);
      });
      result.loadTime = performance.now() - loadT0;
      result.cached = isPipelineCached(id) && result.loadTime < 100;

      // --- Warmup phase ---
      onPhase?.('warmup');
      const warmupT0 = performance.now();
      for (let i = 0; i < warmup; i++) {
        await runInference(modelConfig, pipe);
      }
      result.warmupTime = performance.now() - warmupT0;

      // --- INP measurement: interaction → first inference ---
      onPhase?.('measuring_inp');
      result.inp = await measureINP(() => runInference(modelConfig, pipe));

      // --- Benchmark iterations ---
      onPhase?.('benchmarking');
      const inferenceWindowStart = performance.now();

      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        await runInference(modelConfig, pipe);
        const elapsed = performance.now() - t0;
        result.inferenceIterations.push(elapsed);
        onProgress?.({ status: 'iteration', current: i + 1, total: iterations, ms: elapsed });
      }

      const inferenceWindowEnd = performance.now();

      // --- TBT over inference window ---
      result.tbt = this.longTaskObserver.getTBTInWindow(
        inferenceWindowStart,
        inferenceWindowEnd,
      );
      result.longTasks = this.longTaskObserver.getTasksInWindow(
        inferenceWindowStart,
        inferenceWindowEnd,
      );

      // --- Memory delta ---
      const memAfter = captureMemory();
      result.memory = memoryDelta(memBefore, memAfter);

      // --- Derived stats ---
      const times = result.inferenceIterations;
      result.avgInferenceMs = times.reduce((a, b) => a + b, 0) / times.length;
      result.minInferenceMs = Math.min(...times);
      result.maxInferenceMs = Math.max(...times);
      result.stdDevMs = stdDev(times);
    } catch (err) {
      result.error = err.message;
      console.error(`[benchmark] ${name} failed:`, err);
    }

    this.results.set(id, result);
    onComplete?.(result);
    return result;
  }

  bundleSnapshot() {
    return captureBundleMetrics();
  }

  getAllResults() {
    return Object.fromEntries(this.results);
  }
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}
