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
import { h } from '../core/dom.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const widgets$ = signal([]);
let _widgetGrid = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _addWidgetFormEl(queries) {
  const querySelect = h('select', { class: 'select', id: 'widget-query-id' });
  populateSelect(querySelect, queries, q => q.id, q => q.name);

  return h('div', { class: 'form' },
    h('div', { class: 'form-group' },
      h('label', { for: 'widget-query-id' }, 'Saved Query'),
      querySelect,
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'widget-title' }, 'Widget Title'),
      h('input', { class: 'form-input', id: 'widget-title', placeholder: 'Optional title' }),
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'widget-chart-type' }, 'Chart Type'),
      h('select', { class: 'select', id: 'widget-chart-type' },
        h('option', { value: 'table' },   'Table'),
        h('option', { value: 'bar' },     'Bar Chart'),
        h('option', { value: 'line' },    'Line Chart'),
        h('option', { value: 'pie' },     'Pie Chart'),
        h('option', { value: 'scatter' }, 'Scatter'),
      ),
    ),
    h('div', { id: 'widget-col-selectors', class: 'hidden' },
      h('div', { class: 'form-row' },
        h('div', { class: 'form-group' },
          h('label', { for: 'widget-x-col' }, 'X Column (labels)'),
          h('select', { class: 'select', id: 'widget-x-col' }),
        ),
        h('div', { class: 'form-group' },
          h('label', { for: 'widget-y-col' }, 'Y Column (values)'),
          h('select', { class: 'select', id: 'widget-y-col' }),
        ),
      ),
    ),
    h('div', { class: 'modal-footer' },
      h('button', { type: 'button', class: 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'add-widget-confirm' }, 'Add Widget'),
    ),
  );
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

function _delete(widgetId) {
  Modal.confirm({
    title:        'Remove Widget',
    message:      'This widget will be removed from the dashboard.',
    confirmLabel: 'Remove',
    onConfirm: async () => {
      try {
        await DashboardService.deleteWidget(Store.getDashboardId(), widgetId);
        Toast.success('Widget removed');
        _widgetGrid?.removeWidget(widgetId);
        widgets$.update(ws => ws.filter(w => w.id !== widgetId));
      } catch(err) { Toast.error(err.message); }
    },
  });
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
