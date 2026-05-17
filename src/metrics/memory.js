export function captureMemory() {
  if (!performance.memory) {
    return { supported: false };
  }
  return {
    supported: true,
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
  };
}

export function memoryDelta(before, after) {
  if (!before.supported || !after.supported) return null;
  return {
    delta: after.usedJSHeapSize - before.usedJSHeapSize,
    peakUsed: after.usedJSHeapSize,
    heapLimit: after.jsHeapSizeLimit,
    pressurePercent: (after.usedJSHeapSize / after.jsHeapSizeLimit) * 100,
  };
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const sign = bytes < 0 ? '-' : '+';
  return `${sign}${(Math.abs(bytes) / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
