export function captureBundleMetrics() {
  const entries = performance.getEntriesByType('resource');

  const scripts = entries.filter(
    (e) => e.initiatorType === 'script' || e.name.endsWith('.js'),
  );
  const wasmFiles = entries.filter((e) => e.name.includes('.wasm'));
  const modelFiles = entries.filter(
    (e) => e.name.includes('onnx') || e.name.includes('/resolve/') || e.name.includes('model'),
  );

  const sum = (arr, key) => arr.reduce((s, e) => s + (e[key] || 0), 0);

  return {
    scripts: {
      count: scripts.length,
      transferSize: sum(scripts, 'transferSize'),
      decodedSize: sum(scripts, 'decodedBodySize'),
    },
    wasm: {
      count: wasmFiles.length,
      transferSize: sum(wasmFiles, 'transferSize'),
      decodedSize: sum(wasmFiles, 'decodedBodySize'),
    },
    models: {
      count: modelFiles.length,
      transferSize: sum(modelFiles, 'transferSize'),
      decodedSize: sum(modelFiles, 'decodedBodySize'),
      files: modelFiles.map((e) => ({
        url: e.name.split('?')[0].split('/').slice(-2).join('/'),
        transferSize: e.transferSize,
        duration: Math.round(e.duration),
      })),
    },
    total: {
      transferSize: sum(entries, 'transferSize'),
      decodedSize: sum(entries, 'decodedBodySize'),
      requestCount: entries.length,
    },
  };
}
