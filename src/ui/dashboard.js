import { renderBarChart, renderSparkline } from './charts.js';
import { formatBytes } from '../metrics/memory.js';
import { MODELS } from '../constants.js';

// ── Model card scaffolding ───────────────────────────────────────────────────

export function renderModelCards(container, onRun) {
  container.innerHTML = '';
  for (const model of MODELS) {
    const card = createModelCard(model, onRun);
    container.appendChild(card);
  }
}

function createModelCard(model, onRun) {
  const card = document.createElement('div');
  card.className = 'model-card';
  card.id = `card-${model.id}`;
  card.dataset.modelId = model.id;

  card.innerHTML = `
    <div class="card-header">
      <span class="color-dot" style="background:${model.color}"></span>
      <div class="card-title-group">
        <h3 class="card-name">${model.name}</h3>
        <span class="card-badge">${model.badge}</span>
      </div>
      <button class="run-btn" data-id="${model.id}" aria-label="Run ${model.name}">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <polygon points="3,1 13,7 3,13"/>
        </svg>
        Run
      </button>
    </div>
    <p class="card-desc">${model.description}</p>
    <div class="progress-wrap" id="progress-${model.id}" hidden>
      <div class="progress-label" id="progress-label-${model.id}">Loading…</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progress-fill-${model.id}" style="width:0%"></div>
      </div>
      <div class="progress-detail" id="progress-detail-${model.id}"></div>
    </div>
    <div class="card-metrics" id="metrics-${model.id}" hidden></div>
  `;

  card.querySelector('.run-btn').addEventListener('click', () => onRun(model.id));
  return card;
}

// ── Progress updates ─────────────────────────────────────────────────────────

export function showProgress(modelId) {
  document.getElementById(`progress-${modelId}`)?.removeAttribute('hidden');
}

export function hideProgress(modelId) {
  document.getElementById(`progress-${modelId}`)?.setAttribute('hidden', '');
}

export function updateProgress(modelId, info) {
  const label = document.getElementById(`progress-label-${modelId}`);
  const fill = document.getElementById(`progress-fill-${modelId}`);
  const detail = document.getElementById(`progress-detail-${modelId}`);
  if (!label || !fill) return;

  if (info.status === 'cached') {
    label.textContent = 'Loaded from cache';
    fill.style.width = '100%';
    return;
  }

  if (info.status === 'initiate') {
    label.textContent = `Fetching ${info.file ?? ''}`;
    return;
  }

  if (info.status === 'progress' && info.progress != null) {
    label.textContent = `Downloading ${info.file ?? ''}`;
    fill.style.width = `${info.progress.toFixed(1)}%`;
    if (info.loaded && info.total) {
      detail.textContent = `${fmtMB(info.loaded)} / ${fmtMB(info.total)}`;
    }
    return;
  }

  if (info.status === 'done') {
    label.textContent = `Ready`;
    fill.style.width = '100%';
    detail.textContent = '';
    return;
  }

  if (info.status === 'iteration') {
    label.textContent = `Benchmarking… iteration ${info.current}/${info.total}`;
    fill.style.width = `${(info.current / info.total) * 100}%`;
    if (info.ms != null) detail.textContent = `Last: ${info.ms.toFixed(1)} ms`;
    return;
  }

  if (typeof info.status === 'string') {
    const map = {
      loading: 'Loading model…',
      warmup: 'Warming up…',
      measuring_inp: 'Measuring INP…',
      benchmarking: 'Running iterations…',
    };
    label.textContent = map[info.status] ?? info.status;
  }
}

export function setCardPhase(modelId, phase) {
  updateProgress(modelId, { status: phase });
}

// ── Per-card results ─────────────────────────────────────────────────────────

export function renderCardResult(result) {
  const el = document.getElementById(`metrics-${result.id}`);
  if (!el) return;

  const btn = document.querySelector(`[data-id="${result.id}"]`);
  if (btn) btn.disabled = false;

  if (result.error) {
    el.removeAttribute('hidden');
    el.innerHTML = `<div class="metric-error">⚠ ${result.error}</div>`;
    return;
  }

  const sparkId = `spark-${result.id}`;
  const throttleLabel = result.throttleLabel ?? 'No throttling';
  el.removeAttribute('hidden');
  el.innerHTML = `
    <div class="metric-grid">
      <div class="metric-item" style="grid-column:1/-1;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;margin-bottom:2px">
        <span class="metric-label">CPU throttle</span>
        <span class="metric-value" style="font-size:0.82em">${throttleLabel}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Load time</span>
        <span class="metric-value">${fmtMs(result.loadTime)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Avg inference</span>
        <span class="metric-value">${fmtMs(result.avgInferenceMs)}
          <span class="metric-sub">±${fmtMs(result.stdDevMs)}</span>
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">INP (click→paint)</span>
        <span class="metric-value ${inpClass(result.inp)}">${fmtMs(result.inp)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">TBT (inference)</span>
        <span class="metric-value ${tbtClass(result.tbt)}">${result.tbt != null ? fmtMs(result.tbt) : '—'}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Long tasks</span>
        <span class="metric-value">${result.longTasks?.length ?? '—'}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Memory Δ</span>
        <span class="metric-value">${result.memory ? formatBytes(result.memory.delta) : '—'}</span>
      </div>
    </div>
    <div class="sparkline-row">
      <span class="sparkline-label">Inference times</span>
      <div id="${sparkId}" class="sparkline"></div>
    </div>
  `;

  const model = MODELS.find((m) => m.id === result.id);
  renderSparkline(
    document.getElementById(sparkId),
    result.inferenceIterations,
    model?.color ?? '#6366f1',
  );
}

// ── Comparison charts ────────────────────────────────────────────────────────

export function renderComparisonCharts(container, results) {
  container.innerHTML = '';

  const models = Object.values(results).filter((r) => !r.error);
  if (models.length === 0) return;

  const COLORS = MODELS.reduce((m, d) => ({ ...m, [d.id]: d.color }), {});
  const ds = (key, unit, transform) =>
    models.map((r) => ({
      label: r.name.replace('Whisper ', 'Whisp.').replace('MobileViT', 'MbViT'),
      value: transform ? transform(r[key]) : r[key],
      stdDev: key === 'avgInferenceMs' ? r.stdDevMs : undefined,
      color: COLORS[r.id],
    }));

  const charts = [
    {
      title: 'Avg Inference Time',
      datasets: ds('avgInferenceMs', 'ms'),
      unit: 'ms',
    },
    {
      title: 'Model Load Time',
      datasets: ds('loadTime', 'ms'),
      unit: 'ms',
    },
    {
      title: 'INP Equivalent (click→paint)',
      datasets: ds('inp', 'ms'),
      unit: 'ms',
    },
    {
      title: 'TBT During Inference',
      datasets: ds('tbt', 'ms'),
      unit: 'ms',
    },
    {
      title: 'Memory Pressure',
      datasets: models.map((r) => ({
        label: r.name.replace('Whisper ', 'Whisp.').replace('MobileViT', 'MbViT'),
        value: r.memory?.pressurePercent ?? null,
        color: COLORS[r.id],
      })),
      unit: '%',
    },
    {
      title: 'Memory Delta',
      datasets: models.map((r) => ({
        label: r.name.replace('Whisper ', 'Whisp.').replace('MobileViT', 'MbViT'),
        value: r.memory ? r.memory.delta / 1048576 : null,
        color: COLORS[r.id],
      })),
      unit: 'MB',
    },
  ];

  for (const chartDef of charts) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';
    container.appendChild(wrap);
    renderBarChart(wrap, chartDef);
  }
}

// ── Summary table ─────────────────────────────────────────────────────────────

export function renderSummaryTable(container, results) {
  const models = Object.values(results);
  if (models.length === 0) return;

  const rows = models
    .map((r) => {
      if (r.error) {
        return `<tr class="row-error">
          <td>${r.name}</td>
          <td colspan="9" class="error-cell">⚠ ${r.error}</td>
        </tr>`;
      }
      return `<tr>
        <td><span class="dot-inline" style="background:${MODELS.find(m=>m.id===r.id)?.color}"></span>${r.name}</td>
        <td>${r.dtype}</td>
        <td>${r.throttleLabel ?? '—'}</td>
        <td>${fmtMs(r.loadTime)}</td>
        <td>${fmtMs(r.avgInferenceMs)} <small>±${fmtMs(r.stdDevMs)}</small></td>
        <td class="${inpClass(r.inp)}">${fmtMs(r.inp)}</td>
        <td class="${tbtClass(r.tbt)}">${r.tbt != null ? fmtMs(r.tbt) : '—'}</td>
        <td>${r.longTasks?.length ?? '—'}</td>
        <td>${r.memory ? formatBytes(r.memory.delta) : '—'}</td>
        <td>${r.memory ? r.memory.pressurePercent.toFixed(1) + '%' : '—'}</td>
      </tr>`;
    })
    .join('');

  container.innerHTML = `
    <div class="table-scroll">
      <table class="results-table">
        <thead>
          <tr>
            <th>Model</th><th>dtype</th><th>Throttle</th><th>Load</th><th>Avg Inference</th>
            <th>INP</th><th>TBT</th><th>Long tasks</th><th>Mem Δ</th><th>Mem pressure</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Baseline CWV panel ────────────────────────────────────────────────────────

export function renderBaselineMetrics(container, cwv) {
  container.innerHTML = `
    <div class="baseline-item ${lcpClass(cwv.lcp)}">
      <span class="bl-label">LCP</span>
      <span class="bl-value">${cwv.lcp != null ? cwv.lcp.toFixed(0) + ' ms' : '…'}</span>
    </div>
    <div class="baseline-item">
      <span class="bl-label">FCP</span>
      <span class="bl-value">${cwv.fcp != null ? cwv.fcp.toFixed(0) + ' ms' : '…'}</span>
    </div>
    <div class="baseline-item">
      <span class="bl-label">INP (page)</span>
      <span class="bl-value">${cwv.inp != null ? cwv.inp.toFixed(0) + ' ms' : '…'}</span>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMs(v) {
  if (v == null) return '—';
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(1)} ms`;
}

function fmtMB(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function inpClass(v) {
  if (v == null) return '';
  if (v <= 200) return 'good';
  if (v <= 500) return 'needs-improvement';
  return 'poor';
}

function tbtClass(v) {
  if (v == null) return '';
  if (v <= 200) return 'good';
  if (v <= 600) return 'needs-improvement';
  return 'poor';
}

function lcpClass(v) {
  if (v == null) return '';
  if (v <= 2500) return 'good';
  if (v <= 4000) return 'needs-improvement';
  return 'poor';
}
