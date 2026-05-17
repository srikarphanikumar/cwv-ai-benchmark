export function exportJSON(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, `cwv-ai-benchmark-${timestamp()}.json`);
}

export function exportCSV(payload) {
  const header = [
    'model',
    'dtype',
    'load_ms',
    'warmup_ms',
    'avg_inference_ms',
    'min_inference_ms',
    'max_inference_ms',
    'std_dev_ms',
    'inp_ms',
    'tbt_ms',
    'long_task_count',
    'memory_delta_mb',
    'memory_peak_mb',
    'memory_pressure_pct',
    'error',
  ];

  const rows = Object.values(payload.models).map((r) => [
    r.name,
    r.dtype,
    fmt(r.loadTime),
    fmt(r.warmupTime),
    fmt(r.avgInferenceMs),
    fmt(r.minInferenceMs),
    fmt(r.maxInferenceMs),
    fmt(r.stdDevMs),
    fmt(r.inp),
    fmt(r.tbt),
    r.longTasks?.length ?? '',
    r.memory ? fmt(r.memory.delta / 1048576) : '',
    r.memory ? fmt(r.memory.peakUsed / 1048576) : '',
    r.memory ? fmt(r.memory.pressurePercent) : '',
    r.error ?? '',
  ]);

  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  triggerDownload(blob, `cwv-ai-benchmark-${timestamp()}.csv`);
}

function fmt(v) {
  if (v == null) return '';
  return typeof v === 'number' ? v.toFixed(3) : String(v);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
