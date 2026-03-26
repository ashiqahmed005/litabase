// ===== Queries Feature =====
import Fuse from 'fuse.js';

import { signal } from '../framework/signal.js';
import { Events } from '../framework/events.js';
import { Router } from '../core/router.js';
import { Toast } from '../ui/toast.js';
import { QueryList } from '../components/QueryList.js';
import { QueryService } from '../services/query.service.js';

// ── Reactive state ────────────────────────────────────────────────────────────
const items$    = signal(null);
let _allQueries = [];
let _fuse       = null;
let _list       = null;

// ── Private ───────────────────────────────────────────────────────────────────

async function _loadPage() {
  document.getElementById('queries-search').value = '';
  items$.set(null);
  try {
    _allQueries = await QueryService.list();
    _fuse = new Fuse(_allQueries, {
      keys: ['name', 'description', 'connection_name'],
      threshold: 0.35,
    });
    items$.set(_allQueries);
  } catch(err) { Toast.error(err.message); }
}

function _openInEditor(id) {
  // Emit an event — editor.js handles the navigation and SQL injection.
  // This removes the direct import of EditorFeature from this module.
  Events.emit('query:open', { id });
}

async function _delete(id) {
  if (!confirm('Delete this query?')) return;
  try {
    await QueryService.delete(id);
    Toast.success('Query deleted');
    _loadPage();
  } catch(err) { Toast.error(err.message); }
}

// ── Public ────────────────────────────────────────────────────────────────────

export const QueriesFeature = {
  init() {
    Router.onEnter('queries', () => {
      _list?.destroy();
      _list = new QueryList({
        items$,
        onOpen:   id => _openInEditor(id),
        onDelete: id => _delete(id),
      });
      _list.mount(document.getElementById('queries-list'));
      _loadPage();
    });

    document.getElementById('queries-search').addEventListener('input', (e) => {
      const term = e.target.value.trim();
      items$.set(term && _fuse ? _fuse.search(term).map(r => r.item) : _allQueries);
    });

    // Refresh when a query is saved from the editor.
    Events.on('query:saved', _loadPage);
  },
};
