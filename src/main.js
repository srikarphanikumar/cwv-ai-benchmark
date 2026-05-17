import './ui/styles.css';
import { MODELS, BENCHMARK_DEFAULTS } from './constants.js';
import { BenchmarkRunner } from './benchmark/runner.js';
import { CWVObserver } from './metrics/cwv.js';
import {
  renderModelCards,
  renderCardResult,
  renderComparisonCharts,
  renderSummaryTable,
  renderBaselineMetrics,
  showProgress,
  hideProgress,
  updateProgress,
  setCardPhase,
} from './ui/dashboard.js';
import { exportJSON, exportCSV } from './export/index.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const cwvObserver = new CWVObserver();
const runner = new BenchmarkRunner();
let runConfig = { ...BENCHMARK_DEFAULTS };
let isRunning = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modelsGrid = document.getElementById('models-grid');
const resultsSection = document.getElementById('results-section');
const chartsContainer = document.getElementById('charts-container');
const metricsTable = document.getElementById('metrics-table');
const exportControls = document.getElementById('export-controls');
const baselinePanel = document.getElementById('baseline-metrics');
const runAllBtn = document.getElementById('run-all-btn');
const dtypeSelect = document.getElementById('dtype-select');
const iterationsInput = document.getElementById('iterations-input');
const tbtNotice = document.getElementById('tbt-notice');

// ── Config wiring ─────────────────────────────────────────────────────────────
dtypeSelect?.addEventListener('change', () => {
  runConfig.dtype = dtypeSelect.value;
});

iterationsInput?.addEventListener('change', () => {
  const v = parseInt(iterationsInput.value, 10);
  if (v >= 1 && v <= 20) runConfig.iterations = v;
});

// ── Initial render ────────────────────────────────────────────────────────────
renderModelCards(modelsGrid, (modelId) => runSingleModel(modelId));

// Warn if TBT not supported
if (!runner.tbtSupported) {
  tbtNotice?.removeAttribute('hidden');
}

// Update baseline metrics a few times so LCP settles
function refreshBaseline() {
  renderBaselineMetrics(baselinePanel, cwvObserver.snapshot());
}
refreshBaseline();
setTimeout(refreshBaseline, 1000);
setTimeout(refreshBaseline, 3000);

// ── Run logic ─────────────────────────────────────────────────────────────────
runAllBtn?.addEventListener('click', () => runAll());

async function runAll() {
  if (isRunning) return;
  isRunning = true;
  runAllBtn.disabled = true;

  for (const model of MODELS) {
    await runSingleModel(model.id);
  }

  isRunning = false;
  runAllBtn.disabled = false;
}

async function runSingleModel(modelId) {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return;

  const btn = document.querySelector(`[data-id="${modelId}"]`);
  const card = document.getElementById(`card-${modelId}`);

  if (btn) btn.disabled = true;
  card?.classList.remove('done', 'error');
  card?.classList.add('running');
  showProgress(modelId);

  const result = await runner.runModel(
    model,
    { dtype: runConfig.dtype, iterations: runConfig.iterations, warmup: BENCHMARK_DEFAULTS.warmup },
    {
      onPhase: (phase) => setCardPhase(modelId, phase),
      onProgress: (info) => updateProgress(modelId, info),
      onComplete: (r) => {
        hideProgress(modelId);
        renderCardResult(r);
        card?.classList.remove('running');
        card?.classList.add(r.error ? 'error' : 'done');
        if (btn) btn.disabled = false;
      },
    },
  );

  // Refresh comparison section after each model
  const allResults = runner.getAllResults();
  if (Object.keys(allResults).length > 0) {
    resultsSection?.removeAttribute('hidden');
    renderComparisonCharts(chartsContainer, allResults);
    renderSummaryTable(metricsTable, allResults);
    exportControls?.removeAttribute('hidden');
    renderBundlePanel(allResults);
  }

  // Always refresh baseline after each run
  refreshBaseline();

  return result;
}

// ── Bundle panel ──────────────────────────────────────────────────────────────
function renderBundlePanel(allResults) {
  const existing = document.getElementById('bundle-panel');
  if (existing) existing.remove();

  const bundle = runner.bundleSnapshot();
  const panel = document.createElement('div');
  panel.id = 'bundle-panel';
  panel.className = 'bundle-panel';
  panel.innerHTML = `
    <h3>Bundle &amp; Network</h3>
    <div class="bundle-grid">
      <div class="bundle-stat">
        <span class="bundle-stat-label">JS transfer</span>
        <span class="bundle-stat-value">${fmtMB(bundle.scripts.transferSize)}</span>
      </div>
      <div class="bundle-stat">
        <span class="bundle-stat-label">WASM files</span>
        <span class="bundle-stat-value">${bundle.wasm.count} (${fmtMB(bundle.wasm.transferSize)})</span>
      </div>
      <div class="bundle-stat">
        <span class="bundle-stat-label">Model files fetched</span>
        <span class="bundle-stat-value">${bundle.models.count} (${fmtMB(bundle.models.transferSize)})</span>
      </div>
      <div class="bundle-stat">
        <span class="bundle-stat-label">Total network</span>
        <span class="bundle-stat-value">${fmtMB(bundle.total.transferSize)}</span>
      </div>
      <div class="bundle-stat">
        <span class="bundle-stat-label">Total requests</span>
        <span class="bundle-stat-value">${bundle.total.requestCount}</span>
      </div>
    </div>
  `;
  document.querySelector('.results-section')?.appendChild(panel);
}

// ── Export ────────────────────────────────────────────────────────────────────
document.getElementById('export-json-btn')?.addEventListener('click', () => {
  exportJSON({
    meta: {
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      dtype: runConfig.dtype,
      iterations: runConfig.iterations,
      tbtSupported: runner.tbtSupported,
      baseline: cwvObserver.snapshot(),
      bundle: runner.bundleSnapshot(),
    },
    models: runner.getAllResults(),
  });
});

document.getElementById('export-csv-btn')?.addEventListener('click', () => {
  exportCSV({ models: runner.getAllResults() });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMB(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
