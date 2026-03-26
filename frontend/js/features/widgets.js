// ===== Widgets Feature =====
// Responsibility: render, load, add, and delete widgets within a dashboard.
import { signal } from '../framework/signal.js';
import { Store } from '../core/store.js';
import { Modal } from '../ui/modal.js';
import { Toast } from '../ui/toast.js';
import { WidgetGrid } from '../components/WidgetGrid.js';
import { Charts } from '../charts/charts.js';
import { QueryService } from '../services/query.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { populateSelect } from '../ui/templates.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const widgets$ = signal([]);
let _widgetGrid = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _addWidgetFormEl(queries) {
  const div = document.createElement('div');
  div.className = 'form';
  div.innerHTML = `
    <div class="form-group">
      <label for="widget-query-id">Saved Query</label>
      <select class="select" id="widget-query-id"></select>
    </div>
    <div class="form-group">
      <label for="widget-title">Widget Title</label>
      <input class="form-input" id="widget-title" placeholder="Optional title" />
    </div>
    <div class="form-group">
      <label for="widget-chart-type">Chart Type</label>
      <select class="select" id="widget-chart-type">
        <option value="table">Table</option>
        <option value="bar">Bar Chart</option>
        <option value="line">Line Chart</option>
        <option value="pie">Pie Chart</option>
        <option value="scatter">Scatter</option>
      </select>
    </div>
    <div id="widget-col-selectors" class="hidden">
      <div class="form-row">
        <div class="form-group">
          <label for="widget-x-col">X Column (labels)</label>
          <select class="select" id="widget-x-col"></select>
        </div>
        <div class="form-group">
          <label for="widget-y-col">Y Column (values)</label>
          <select class="select" id="widget-y-col"></select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="add-widget-confirm">Add Widget</button>
    </div>`;
  populateSelect(div.querySelector('#widget-query-id'), queries, q => q.id, q => q.name);
  return div;
}

// ── Private handlers ──────────────────────────────────────────────────────────

// Called by WidgetGrid for each widget after render.
async function _loadWidgetData(widget, chartsMap) {
  const container = document.getElementById(`widget-content-${widget.id}`);
  if (!container) return;
  try {
    const result = await QueryService.runSaved(widget.query_id);
    if (!widget.chart_type || widget.chart_type === 'table') {
      container.className = 'widget-table-wrap';
      Charts.renderTable(container, result.columns, result.rows);
    } else {
      container.className = 'widget-chart-wrap';
      const canvas   = document.createElement('canvas');
      const chartRef = { instance: null };
      chartsMap.set(widget.id, chartRef);
      container.replaceChildren(canvas);
      const cfg = widget.chart_config || {};
      Charts.renderWidgetChart(
        canvas, chartRef, widget.chart_type, result.columns, result.rows,
        cfg.x_column || result.columns[0],
        cfg.y_column || result.columns[1],
      );
    }
  } catch(err) {
    const { errorStateEl } = await import('../ui/states.js');
    container.replaceChildren(errorStateEl(err.message));
  }
}

async function _delete(widgetId) {
  if (!confirm('Remove this widget?')) return;
  try {
    await DashboardService.deleteWidget(Store.getDashboardId(), widgetId);
    Toast.success('Widget removed');
    // Optimistically remove from DOM, then sync signal.
    _widgetGrid?.removeWidget(widgetId);
    widgets$.update(ws => ws.filter(w => w.id !== widgetId));
  } catch(err) { Toast.error(err.message); }
}

async function _openAddModal() {
  let queries = [];
  try { queries = await QueryService.list(); } catch(e) {}
  if (!queries.length) return Toast.error('Save a query first before adding widgets');

  Modal.open('Add Widget', _addWidgetFormEl(queries));

  async function _loadColumns() {
    try {
      const result = await QueryService.runSaved(document.getElementById('widget-query-id').value);
      populateSelect(document.getElementById('widget-x-col'), result.columns, c => c, c => c);
      populateSelect(document.getElementById('widget-y-col'), result.columns, c => c, c => c);
      if (result.columns.length > 1) document.getElementById('widget-y-col').selectedIndex = 1;
    } catch(e) {}
  }

  document.getElementById('widget-query-id').addEventListener('change', _loadColumns);
  document.getElementById('widget-chart-type').addEventListener('change', (e) => {
    const isChart = e.target.value !== 'table';
    document.getElementById('widget-col-selectors').classList.toggle('hidden', !isChart);
    if (isChart) _loadColumns();
  });

  document.getElementById('add-widget-confirm').addEventListener('click', async () => {
    const chartType   = document.getElementById('widget-chart-type').value;
    const chartConfig = chartType !== 'table' ? {
      x_column: document.getElementById('widget-x-col').value,
      y_column: document.getElementById('widget-y-col').value,
    } : {};
    try {
      await DashboardService.addWidget(Store.getDashboardId(), {
        query_id:     document.getElementById('widget-query-id').value,
        title:        document.getElementById('widget-title').value || null,
        chart_type:   chartType,
        chart_config: chartConfig,
      });
      Modal.close();
      Toast.success('Widget added!');
      const dash = await DashboardService.get(Store.getDashboardId());
      widgets$.set(dash.widgets); // signal triggers WidgetGrid update
    } catch(err) { Toast.error(err.message); }
  });
}

// ── Public ────────────────────────────────────────────────────────────────────

export const WidgetsFeature = {

  // Called by DashboardFeature when a dashboard is opened.
  render(widgets) {
    _widgetGrid?.destroy();
    _widgetGrid = new WidgetGrid({
      widgets$,
      onDelete:   id => _delete(id),
      onReorder:  (id, idx) => {
        DashboardService.updateWidget(Store.getDashboardId(), id, { position: idx })
          .catch(() => {}); // non-critical — visual order already updated
      },
      onLoadData: (widget, chartsMap) => _loadWidgetData(widget, chartsMap),
    });
    _widgetGrid.mount(document.getElementById('dashboard-widgets'));
    widgets$.set(widgets);
  },

  init() {
    document.getElementById('add-widget-btn').addEventListener('click', _openAddModal);
  },
};
