const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) {
    if (typeof child === 'string') el.textContent = child;
    else if (child) el.appendChild(child);
  }
  return el;
}

export function renderBarChart(container, { title, datasets, unit = 'ms', height = 220 }) {
  container.innerHTML = '';

  const W = container.clientWidth || 480;
  const H = height;
  const PAD = { top: 36, right: 20, bottom: 48, left: 64 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allValues = datasets.flatMap((d) => d.value ?? 0).filter(isFinite);
  const maxVal = Math.max(...allValues, 1);
  const scale = chartH / maxVal;

  const barW = Math.floor(chartW / datasets.length) - 8;

  const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

  // Background
  root.appendChild(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'var(--surface-2)', rx: 8 }),
  );

  // Title
  root.appendChild(
    svg(
      'text',
      { x: PAD.left, y: 22, fill: 'var(--text-muted)', 'font-size': '11', 'font-family': 'inherit' },
      title,
    ),
  );

  const g = svg('g', { transform: `translate(${PAD.left},${PAD.top})` });
  root.appendChild(g);

  // Y-axis gridlines
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const y = chartH - (i / ticks) * chartH;
    const val = ((i / ticks) * maxVal).toFixed(maxVal > 100 ? 0 : 1);
    g.appendChild(
      svg('line', {
        x1: 0, y1: y, x2: chartW, y2: y,
        stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': i === 0 ? '' : '4 4',
      }),
    );
    g.appendChild(
      svg('text', {
        x: -6, y: y + 4, fill: 'var(--text-muted)', 'font-size': '10',
        'text-anchor': 'end', 'font-family': 'inherit',
      }, `${val}`),
    );
  }

  // Bars + labels
  datasets.forEach((d, i) => {
    const x = i * (barW + 8) + 4;
    const barHeight = isFinite(d.value) ? d.value * scale : 0;
    const y = chartH - barHeight;

    // Error bar (std dev)
    if (d.stdDev && isFinite(d.stdDev)) {
      const sdPx = d.stdDev * scale;
      const cx = x + barW / 2;
      g.appendChild(svg('line', {
        x1: cx, y1: y - sdPx, x2: cx, y2: y + sdPx,
        stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.5,
      }));
      g.appendChild(svg('line', {
        x1: cx - 4, y1: y - sdPx, x2: cx + 4, y2: y - sdPx,
        stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.5,
      }));
    }

    // Bar
    g.appendChild(
      svg('rect', {
        x, y: d.value ? y : chartH - 2,
        width: barW,
        height: barHeight || 2,
        fill: d.color,
        rx: 3,
        opacity: d.value ? 1 : 0.3,
      }),
    );

    // Value label above bar
    if (d.value) {
      g.appendChild(
        svg('text', {
          x: x + barW / 2, y: y - 6,
          fill: 'var(--text-primary)', 'font-size': '10', 'text-anchor': 'middle',
          'font-family': 'inherit', 'font-weight': '600',
        }, `${Number(d.value).toFixed(1)}${unit}`),
      );
    }

    // X-axis label
    g.appendChild(
      svg('text', {
        x: x + barW / 2, y: chartH + 16,
        fill: 'var(--text-secondary)', 'font-size': '11', 'text-anchor': 'middle',
        'font-family': 'inherit',
      }, d.label),
    );
  });

  // X-axis line
  g.appendChild(
    svg('line', {
      x1: 0, y1: chartH, x2: chartW, y2: chartH,
      stroke: 'var(--border)', 'stroke-width': 1,
    }),
  );

  // Unit label
  g.appendChild(
    svg('text', {
      x: -PAD.left + 8, y: chartH / 2,
      fill: 'var(--text-muted)', 'font-size': '10', 'text-anchor': 'middle',
      transform: `rotate(-90, ${-PAD.left + 8}, ${chartH / 2})`,
      'font-family': 'inherit',
    }, unit),
  );

  container.appendChild(root);
}

export function renderSparkline(container, values, color) {
  if (!values?.length) return;
  const W = 80, H = 28;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H * 0.8 - 2;
    return `${x},${y}`;
  }).join(' ');

  container.innerHTML = '';
  const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  root.appendChild(
    svg('polyline', {
      points, fill: 'none', stroke: color,
      'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }),
  );
  container.appendChild(root);
}
