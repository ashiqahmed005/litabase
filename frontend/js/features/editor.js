// ===== Editor Feature =====
import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

import { Events } from '../framework/events.js';
import { Router } from '../core/router.js';
import { Modal } from '../ui/modal.js';
import { Toast } from '../ui/toast.js';
import { populateSelect } from '../ui/templates.js';
import { Utils } from '../core/utils.js';
import { Charts } from '../charts/charts.js';
import { QueryService } from '../services/query.service.js';
import { ConnectionsFeature } from './connections.js';

let _editor     = null;
let _lastResult = null;

// ── Form factory ──────────────────────────────────────────────────────────────
function _saveQueryFormEl() {
  const div = document.createElement('div');
  div.className = 'form';
  div.innerHTML = `
    <div class="form-group">
      <label for="save-query-name">Query Name</label>
      <input class="form-input" id="save-query-name" placeholder="e.g. Monthly Revenue" />
    </div>
    <div class="form-group">
      <label for="save-query-desc">Description</label>
      <textarea class="form-textarea" id="save-query-desc" placeholder="Optional description"></textarea>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-query-confirm-btn">Save</button>
    </div>`;
  return div;
}

// ── Private ───────────────────────────────────────────────────────────────────

function _initEditor() {
  if (_editor) return; // persists across navigations — only create once

  _editor = new EditorView({
    parent: document.getElementById('sql-editor'),
    state: EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        indentOnInput(),
        EditorView.lineWrapping,
        sql(),
        oneDark,
        placeholder('-- Write SQL here\n-- Ctrl+Enter / Cmd+Enter to run'),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          { key: 'Ctrl-Enter', run: () => { _run(); return true; } },
          { key: 'Mod-Enter',  run: () => { _run(); return true; } },
        ]),
      ],
    }),
  });
}

async function _run() {
  const sqlText      = EditorFeature.getSql();
  const connectionId = document.getElementById('connection-select').value;
  if (!sqlText)      return Toast.error('Write a SQL query first');
  if (!connectionId) return Toast.error('Select a connection');

  const btn = document.getElementById('run-query-btn');
  btn.textContent = '⏳ Running...';
  btn.disabled    = true;
  try {
    _lastResult = await QueryService.run(connectionId, sqlText);
    _displayResults(_lastResult);
  } catch(err) {
    Toast.error(err.message);
    document.getElementById('results-section').classList.add('hidden');
  } finally {
    btn.textContent = '▶ Run';
    btn.disabled    = false;
  }
}

function _displayResults(result) {
  const chartType = document.getElementById('chart-type-select').value;
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('results-count').textContent = `${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}`;
  if (result.executionMs) document.getElementById('exec-time').textContent = `${result.executionMs}ms`;

  _syncColumnSelectors(result.columns);

  const tableWrap = document.getElementById('results-table-wrap');
  const chartWrap = document.getElementById('results-chart-wrap');

  if (chartType === 'table') {
    tableWrap.classList.remove('hidden');
    chartWrap.classList.add('hidden');
    Charts.renderTable(tableWrap, result.columns, result.rows);
  } else {
    tableWrap.classList.add('hidden');
    chartWrap.classList.remove('hidden');
    Charts.renderChart(
      document.getElementById('results-chart'), chartType, result.columns, result.rows,
      document.getElementById('chart-x-col').value || result.columns[0],
      document.getElementById('chart-y-col').value || result.columns[1],
    );
  }
}

function _syncColumnSelectors(columns) {
  populateSelect(document.getElementById('chart-x-col'), columns, c => c, c => c);
  populateSelect(document.getElementById('chart-y-col'), columns, c => c, c => c);
  if (columns.length > 1) document.getElementById('chart-y-col').selectedIndex = 1;
}

function _openSaveModal() {
  const sqlText = EditorFeature.getSql();
  if (!sqlText) return Toast.error('Write a query first');
  Modal.open('Save Query', _saveQueryFormEl());
  document.getElementById('save-query-confirm-btn').addEventListener('click', async () => {
    const name = document.getElementById('save-query-name').value.trim();
    if (!name) return Toast.error('Enter a name');
    try {
      const query = await QueryService.create({
        name,
        description:   document.getElementById('save-query-desc').value,
        sql_text:      sqlText,
        connection_id: document.getElementById('connection-select').value,
      });
      Toast.success('Query saved!');
      Modal.close();
      Events.emit('query:saved', query); // QueriesFeature refreshes its list
    } catch(err) { Toast.error(err.message); }
  });
}

// ── Public ────────────────────────────────────────────────────────────────────

export const EditorFeature = {
  getSql() { return _editor ? _editor.state.doc.toString().trim() : ''; },

  setSql(text) {
    if (!_editor) return;
    _editor.dispatch({
      changes: { from: 0, to: _editor.state.doc.length, insert: text },
    });
  },

  init() {
    Router.onEnter('editor', async () => {
      await ConnectionsFeature.loadIntoSelect();
      _initEditor();
    });

    // Open a saved query — emitted by QueriesFeature (no circular import needed).
    Events.on('query:open', async ({ id }) => {
      try {
        const q = await QueryService.get(id);
        Router.navigate('editor');
        // Brief delay — CodeMirror needs to be visible before dispatch works.
        setTimeout(() => {
          EditorFeature.setSql(q.sql_text);
          const sel = document.getElementById('connection-select');
          if (q.connection_id) sel.value = q.connection_id;
        }, 100);
      } catch(err) { Toast.error(err.message); }
    });

    // Refresh connection select when a connection is added or removed.
    Events.on('connection:saved',   () => ConnectionsFeature.loadIntoSelect());
    Events.on('connection:deleted', () => ConnectionsFeature.loadIntoSelect());

    document.getElementById('run-query-btn').addEventListener('click', _run);
    document.getElementById('save-query-btn').addEventListener('click', _openSaveModal);
    document.getElementById('export-csv-btn').addEventListener('click', () => {
      if (!_lastResult) return Toast.error('No data to export');
      Utils.exportCsv(_lastResult.columns, _lastResult.rows);
    });

    document.getElementById('chart-type-select').addEventListener('change', (e) => {
      const isChart = e.target.value !== 'table';
      document.querySelectorAll('#chart-x-col, #chart-y-col')
        .forEach(el => el.classList.toggle('hidden', !isChart));
      if (_lastResult) _displayResults(_lastResult);
    });

    ['chart-x-col', 'chart-y-col'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => {
        if (_lastResult) _displayResults(_lastResult);
      })
    );
  },
};
