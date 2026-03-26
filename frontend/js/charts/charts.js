// ===== Charts =====
// Renders Chart.js charts and data tables. No knowledge of features or services.
import Chart from 'chart.js/auto';

const THEME = {
  colors:  ['#5b7cf6','#34d399','#fbbf24','#f87171','#a78bfa',
            '#38bdf8','#fb923c','#4ade80','#f472b6','#facc15'],
  text:    '#e2e8f0',
  subtext: '#8892a4',
  grid:    '#2e3348',
  tooltip: '#22263a',
  bg:      '#1a1d27',
};

// ── Config helpers ──────────────────────────────────────────────────────────

function _commonOptions() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend:  { labels: { color: THEME.text, font: { size: 12 } } },
      tooltip: { backgroundColor: THEME.tooltip, titleColor: THEME.text, bodyColor: THEME.subtext },
    },
  };
}

function _axisScales(xLabel, yLabel) {
  const axis = (label) => ({
    ticks: { color: THEME.subtext, maxTicksLimit: 12 },
    grid:  { color: THEME.grid },
    title: { display: true, text: label, color: THEME.subtext },
  });
  return { x: axis(xLabel), y: axis(yLabel) };
}

// ── Chart builders (Strategy pattern) ──────────────────────────────────────
// Adding a chart type = adding one entry here. No if/else chains.

const _BUILDERS = {
  pie({ labels, values }) {
    return {
      type: 'pie',
      data: { labels, datasets: [{ data: values, backgroundColor: THEME.colors, borderWidth: 1, borderColor: THEME.bg }] },
      options: _commonOptions(),
    };
  },
  scatter({ labels, values, xLabel, yLabel }) {
    return {
      type: 'scatter',
      data: { datasets: [{ label: yLabel, data: labels.map((l, i) => ({ x: parseFloat(l) || i, y: values[i] })), backgroundColor: THEME.colors[0] + 'aa' }] },
      options: { ..._commonOptions(), scales: _axisScales(xLabel, yLabel) },
    };
  },
  line({ labels, values, xLabel, yLabel }) {
    return {
      type: 'line',
      data: { labels, datasets: [{ label: yLabel, data: values, backgroundColor: THEME.colors[0] + '33', borderColor: THEME.colors[0], borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 }] },
      options: { ..._commonOptions(), scales: _axisScales(xLabel, yLabel) },
    };
  },
  bar({ labels, values, xLabel, yLabel }) {
    return {
      type: 'bar',
      data: { labels, datasets: [{ label: yLabel, data: values, backgroundColor: THEME.colors.slice(0, values.length), borderColor: THEME.colors[0], borderWidth: 2 }] },
      options: { ..._commonOptions(), scales: _axisScales(xLabel, yLabel) },
    };
  },
};

function _buildConfig(type, labels, values, xLabel, yLabel) {
  return (_BUILDERS[type] ?? _BUILDERS.bar)({ labels, values, xLabel, yLabel });
}

function _extractData(columns, rows, xCol, yCol) {
  const xIdx = columns.indexOf(xCol);
  const yIdx = columns.indexOf(yCol);
  if (xIdx === -1 || yIdx === -1) return null;
  return {
    labels: rows.map(r => String(r[xIdx] ?? '')),
    values: rows.map(r => parseFloat(r[yIdx]) || 0),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

// The editor owns one chart instance; re-running destroys the previous one.
let _editorChart = null;

export function renderTable(container, columns, rows) {
  if (!rows.length) {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    wrap.appendChild(Object.assign(document.createElement('div'), { className: 'empty-icon', textContent: '○' }));
    wrap.appendChild(Object.assign(document.createElement('p'), { textContent: 'No rows returned' }));
    container.replaceChildren(wrap);
    return;
  }
  const table  = document.createElement('table');
  const thead  = table.createTHead();
  const headerRow = thead.insertRow();
  columns.forEach(c => headerRow.appendChild(Object.assign(document.createElement('th'), { textContent: c })));

  const tbody = table.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    row.forEach(cell => {
      const td = tr.insertCell();
      if (cell == null) {
        td.appendChild(Object.assign(document.createElement('span'), { className: 'null-value', textContent: 'NULL' }));
      } else {
        td.textContent = String(cell);
      }
    });
  });
  container.replaceChildren(table);
}

export function renderChart(canvas, type, columns, rows, xCol, yCol) {
  if (_editorChart) { _editorChart.destroy(); _editorChart = null; }
  const data = _extractData(columns, rows, xCol, yCol);
  if (!data) return;
  _editorChart = new Chart(canvas, _buildConfig(type, data.labels, data.values, xCol, yCol));
}

// Each widget gets its own chartRef = { instance: null } so widget charts
// and the editor chart are completely independent.
export function renderWidgetChart(canvas, chartRef, type, columns, rows, xCol, yCol) {
  if (chartRef.instance) { chartRef.instance.destroy(); chartRef.instance = null; }
  const data = _extractData(columns, rows, xCol, yCol);
  if (!data) return;
  chartRef.instance = new Chart(canvas, _buildConfig(type, data.labels, data.values, xCol, yCol));
}

export const Charts = { renderTable, renderChart, renderWidgetChart };
