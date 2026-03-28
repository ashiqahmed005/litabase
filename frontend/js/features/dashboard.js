// ===== Dashboard Feature =====
// Responsibility: dashboard list, open, create, delete.
// Widget concerns are in widgets.js.
import { signal, effect } from '../framework/signal.js';
import { Store } from '../core/store.js';
import { Router } from '../core/router.js';
import { Modal } from '../ui/modal.js';
import { Toast } from '../ui/toast.js';
import { DashboardGrid } from '../components/DashboardGrid.js';
import { DashboardService } from '../services/dashboard.service.js';
import { WidgetsFeature } from './widgets.js';
import { h } from '../core/dom.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const items$          = signal(null);
const activeName$     = signal('');   // name of the currently open dashboard
let _grid             = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _newDashboardFormEl() {
  return h('div', { class: 'form' },
    h('div', { class: 'form-group' },
      h('label', { for: 'new-dash-name' }, 'Dashboard Name'),
      h('input', { class: 'form-input', id: 'new-dash-name', placeholder: 'e.g. Sales Overview' }),
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'new-dash-desc' }, 'Description'),
      h('textarea', { class: 'form-textarea', id: 'new-dash-desc', placeholder: 'Optional description' }),
    ),
    h('div', { class: 'modal-footer' },
      h('button', { type: 'button', class: 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'create-dash-btn' }, 'Create'),
    ),
  );
}

// ── Private handlers ──────────────────────────────────────────────────────────

async function _loadPage() {
  items$.set(null);
  try {
    items$.set(await DashboardService.list());
  } catch(err) { Toast.error(err.message); }
}

async function _open(id) {
  Store.setDashboardId(id);
  Router.navigate('dashboard-view');
  try {
    const dash = await DashboardService.get(id);
    activeName$.set(dash.name);
    document.getElementById('dashboard-title').textContent = dash.name;
    WidgetsFeature.render(dash.widgets);
  } catch(err) { Toast.error(err.message); }
}

function _openNewModal() {
  Modal.open('New Dashboard', _newDashboardFormEl());
  document.getElementById('create-dash-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-dash-name').value.trim();
    if (!name) return Toast.error('Enter a name');
    try {
      const dash = await DashboardService.create({
        name,
        description: document.getElementById('new-dash-desc').value,
      });
      Modal.close();
      Toast.success('Dashboard created!');
      _open(dash.id);
    } catch(err) { Toast.error(err.message); }
  });
}

function _deleteCurrent() {
  Modal.confirm({
    title:        'Delete Dashboard',
    message:      'This will permanently delete the dashboard and all its widgets.',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await DashboardService.delete(Store.getDashboardId());
        Toast.success('Dashboard deleted');
        Router.navigate('dashboards');
      } catch(err) { Toast.error(err.message); }
    },
  });
}

// ── Public ────────────────────────────────────────────────────────────────────

export const DashboardFeature = {
  init() {
    // Keep the browser tab title in sync with the open dashboard name.
    effect(() => {
      document.title = activeName$.get()
        ? `${activeName$.get()} — Litabase`
        : 'Litabase';
    }, activeName$);

    Router.onEnter('dashboards', () => {
      activeName$.set(''); // clear title when returning to dashboard list
      _grid?.destroy();
      _grid = new DashboardGrid({
        items$,
        onOpen: id => _open(id),
      });
      _grid.mount(document.getElementById('dashboards-grid'));
      _loadPage();
    });

    document.getElementById('new-dashboard-btn').addEventListener('click', _openNewModal);
    document.getElementById('delete-dashboard-btn').addEventListener('click', _deleteCurrent);
  },
};
