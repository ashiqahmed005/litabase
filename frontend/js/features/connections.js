// ===== Connections Feature =====
import Fuse from 'fuse.js';

import { signal } from '../framework/signal.js';
import { Utils } from '../core/utils.js';
import { Events } from '../framework/events.js';
import { Router } from '../core/router.js';
import { Modal } from '../ui/modal.js';
import { Toast } from '../ui/toast.js';
import { ConnectionList } from '../components/ConnectionList.js';
import { ConnectionService } from '../services/connection.service.js';
import { h } from '../core/dom.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const items$  = signal(null);
let _allConns = [];
let _fuse     = null;
let _list     = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _newConnectionFormEl() {
  return h('div', { class: 'form' },
    h('div', { class: 'form-group' },
      h('label', { for: 'conn-name' }, 'Connection Name'),
      h('input', { class: 'form-input', id: 'conn-name', placeholder: 'e.g. Production DB' }),
    ),
    h('div', { class: 'form-group' },
      h('label', { for: 'conn-type' }, 'Type'),
      h('select', { class: 'select', id: 'conn-type' },
        h('option', { value: 'postgres' }, 'PostgreSQL'),
        h('option', { value: 'mysql' },    'MySQL'),
        h('option', { value: 'sqlite' },   'SQLite'),
      ),
    ),
    h('div', { id: 'conn-host-fields' },
      h('div', { class: 'form-row' },
        h('div', { class: 'form-group' },
          h('label', { for: 'conn-host' }, 'Host'),
          h('input', { class: 'form-input', id: 'conn-host', placeholder: 'localhost' }),
        ),
        h('div', { class: 'form-group' },
          h('label', { for: 'conn-port' }, 'Port'),
          h('input', { class: 'form-input', id: 'conn-port', type: 'number', placeholder: '5432' }),
        ),
      ),
      h('div', { class: 'form-row' },
        h('div', { class: 'form-group' },
          h('label', { for: 'conn-database' }, 'Database'),
          h('input', { class: 'form-input', id: 'conn-database', placeholder: 'mydb' }),
        ),
        h('div', { class: 'form-group' },
          h('label', { for: 'conn-username' }, 'Username'),
          h('input', { class: 'form-input', id: 'conn-username', placeholder: 'postgres' }),
        ),
      ),
      h('div', { class: 'form-group' },
        h('label', { for: 'conn-password' }, 'Password'),
        h('input', { class: 'form-input', id: 'conn-password', type: 'password', placeholder: 'Password' }),
      ),
    ),
    h('div', { id: 'conn-sqlite-fields', class: 'hidden' },
      h('div', { class: 'form-group' },
        h('label', { for: 'conn-sqlite-path' }, 'Database File Path'),
        h('input', { class: 'form-input', id: 'conn-sqlite-path', placeholder: '/data/mydb.sqlite' }),
      ),
    ),
    h('div', { class: 'modal-footer' },
      h('button', { type: 'button', class: 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'save-conn-btn' }, 'Save Connection'),
    ),
  );
}

// ── Private handlers ──────────────────────────────────────────────────────────

function _toggleFields() {
  const isSqlite = document.getElementById('conn-type').value === 'sqlite';
  document.getElementById('conn-host-fields').classList.toggle('hidden', isSqlite);
  document.getElementById('conn-sqlite-fields').classList.toggle('hidden', !isSqlite);
}

async function _handleSave() {
  const type     = document.getElementById('conn-type').value;
  const isSqlite = type === 'sqlite';
  const data = {
    name:          document.getElementById('conn-name').value.trim(),
    type,
    host:          isSqlite ? null : document.getElementById('conn-host').value,
    port:          isSqlite ? null : parseInt(document.getElementById('conn-port').value) || null,
    database_name: isSqlite ? document.getElementById('conn-sqlite-path').value
                            : document.getElementById('conn-database').value,
    username:      isSqlite ? null : document.getElementById('conn-username').value,
    password:      isSqlite ? null : document.getElementById('conn-password').value,
  };
  if (!data.name) return Toast.error('Enter a connection name');
  try {
    const conn = await ConnectionService.create(data);
    Modal.close();
    Toast.success('Connection saved!');
    Events.emit('connection:saved', conn);
    _loadPage();
  } catch(err) { Toast.error(err.message); }
}

async function _test(id) {
  Toast.info('Testing connection...');
  try {
    const res = await ConnectionService.test(id);
    Toast.success(res.message);
  } catch(err) { Toast.error(err.message); }
}

function _delete(id) {
  Modal.confirm({
    title: 'Delete Connection',
    message: 'This will permanently delete the connection and all saved queries that use it.',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await ConnectionService.delete(id);
        Toast.success('Connection deleted');
        Events.emit('connection:deleted', { id });
        _loadPage();
      } catch(err) { Toast.error(err.message); }
    },
  });
}

async function _loadPage() {
  document.getElementById('connections-search').value = '';
  items$.set(null);
  try {
    _allConns = await ConnectionService.list();
    _fuse = new Fuse(_allConns, {
      keys: ['name', 'type', 'host', 'database_name'],
      threshold: 0.35,
    });
    items$.set(_allConns);
  } catch(err) { Toast.error(err.message); }
}

function _openNewModal() {
  Modal.open('New Connection', _newConnectionFormEl());
  document.getElementById('conn-type').addEventListener('change', _toggleFields);
  document.getElementById('save-conn-btn').addEventListener('click', _handleSave);
}

// ── Public ────────────────────────────────────────────────────────────────────

export const ConnectionsFeature = {

  // Used by editor.js on route enter — fetches fresh list into the <select>.
  async loadIntoSelect() {
    try {
      const conns = await ConnectionService.list();
      const sel   = document.getElementById('connection-select');
      if (!conns.length) {
        sel.replaceChildren(Object.assign(document.createElement('option'), {
          value: '', textContent: 'No connections — add one first',
        }));
        return;
      }
      const { populateSelect } = await import('../ui/templates.js');
      populateSelect(sel, conns, c => c.id, c => `${c.name} (${c.type})`);
    } catch(e) {}
  },

  init() {
    Router.onEnter('connections', () => {
      _list?.destroy();
      _list = new ConnectionList({
        items$,
        onTest:   id => _test(id),
        onDelete: id => _delete(id),
      });
      _list.mount(document.getElementById('connections-list'));
      _loadPage();
    });

    document.getElementById('connections-search').addEventListener('input', Utils.debounce((e) => {
      const term = e.target.value.trim();
      items$.set(term && _fuse ? _fuse.search(term).map(r => r.item) : _allConns);
    }, 200));

    document.getElementById('new-connection-btn').addEventListener('click', _openNewModal);
  },
};
