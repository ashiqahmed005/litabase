// ===== Schedules Feature =====
import { signal } from '../framework/signal.js';
import { Router } from '../core/router.js';
import { Modal } from '../ui/modal.js';
import { Toast } from '../ui/toast.js';
import { ScheduleList } from '../components/ScheduleList.js';
import { ScheduleService } from '../services/schedule.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { populateSelect } from '../ui/templates.js';
import { h } from '../core/dom.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const items$ = signal(null);
let _list    = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _newScheduleFormEl(dashboards) {
  const dashSelect = h('select', { class: 'select', id: 'sched-dashboard' });
  populateSelect(dashSelect, dashboards, d => d.id, d => d.name);

  return h('div', { class: 'form' },
    h('div', { class: 'form-group' },
      h('label', { for: 'sched-name' }, 'Schedule Name'),
      h('input', { class: 'form-input', id: 'sched-name', placeholder: 'e.g. Weekly Sales Report' }),
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'sched-dashboard' }, 'Dashboard'),
      dashSelect,
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'sched-cron' }, 'Cron Expression'),
      h('input', { class: 'form-input', id: 'sched-cron', value: '0 9 * * 1', placeholder: '0 9 * * 1  (Monday 9am)' }),
      h('span', { class: 'form-hint' }, 'Format: minute hour day month weekday'),
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'sched-recipients' }, 'Recipients (comma separated)'),
      h('input', { class: 'form-input', id: 'sched-recipients', placeholder: 'alice@example.com, bob@example.com' }),
    ),
    h('div', { class: 'modal-footer' },
      h('button', { type: 'button', class: 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'create-sched-btn' }, 'Create Schedule'),
    ),
  );
}

// ── Private handlers ──────────────────────────────────────────────────────────

async function _loadPage() {
  items$.set(null);
  try {
    items$.set(await ScheduleService.list());
  } catch(err) { Toast.error(err.message); }
}

async function _openNewModal() {
  let dashboards = [];
  try { dashboards = await DashboardService.list(); } catch(e) {}
  if (!dashboards.length) return Toast.error('Create a dashboard first');
  Modal.open('New Schedule', _newScheduleFormEl(dashboards));
  document.getElementById('create-sched-btn').addEventListener('click', _handleCreate);
}

async function _handleCreate() {
  const recipients = document.getElementById('sched-recipients').value
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!recipients.length) return Toast.error('Add at least one recipient');
  try {
    await ScheduleService.create({
      name:            document.getElementById('sched-name').value.trim(),
      dashboard_id:    document.getElementById('sched-dashboard').value,
      cron_expression: document.getElementById('sched-cron').value.trim(),
      recipients,
    });
    Modal.close();
    Toast.success('Schedule created!');
    _loadPage();
  } catch(err) { Toast.error(err.message); }
}

async function _trigger(id) {
  try {
    await ScheduleService.run(id);
    Toast.success('Report triggered — emails will be sent shortly');
  } catch(err) { Toast.error(err.message); }
}

function _delete(id) {
  Modal.confirm({
    title:        'Delete Schedule',
    message:      'This scheduled report will be permanently deleted.',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await ScheduleService.delete(id);
        Toast.success('Schedule deleted');
        _loadPage();
      } catch(err) { Toast.error(err.message); }
    },
  });
}

// ── Public ────────────────────────────────────────────────────────────────────

export const SchedulesFeature = {
  init() {
    Router.onEnter('schedules', () => {
      _list?.destroy();
      _list = new ScheduleList({
        items$,
        onTrigger: id => _trigger(id),
        onDelete:  id => _delete(id),
      });
      _list.mount(document.getElementById('schedules-list'));
      _loadPage();
    });

    document.getElementById('new-schedule-btn').addEventListener('click', _openNewModal);
  },
};
