// ===== WidgetGrid component =====
// props: { widgets$, onDelete, onReorder, onLoadData }
//   widgets$    — signal<Widget[]>
//   onDelete    — (widgetId) => void
//   onReorder   — (widgetId, newIndex) => void
//   onLoadData  — (widget, chartsMap) => void  — called after each render
import Sortable from 'sortablejs';
import { Component } from '../framework/component.js';
import { emptyStateEl } from '../ui/states.js';
import { h } from '../core/dom.js';

export class WidgetGrid extends Component {
  constructor(props) {
    super(props);
    this._charts   = new Map(); // widgetId → { instance: Chart | null }
    this._sortable = null;
  }

  onMount() {
    this.watch(this.props.widgets$);
    this._postRender();
  }

  // Override update to destroy charts + sortable before swapping DOM.
  update() {
    this._destroyCharts();
    this._sortable?.destroy();
    this._sortable = null;
    super.update();
    this._postRender();
  }

  onDestroy() {
    this._destroyCharts();
    this._sortable?.destroy();
    this._sortable = null;
  }

  render() {
    const widgets = this.props.widgets$.get();
    const grid = document.createElement('div');
    grid.className = 'widgets-grid';

    if (!widgets.length) {
      const empty = emptyStateEl('⊕', 'No widgets yet. Add a widget to get started.');
      empty.style.gridColumn = '1 / -1';
      grid.appendChild(empty);
      return grid;
    }

    widgets.forEach(w => {
      const card = h('div', { class: 'widget-card', 'data-widget-id': w.id },
        h('div', { class: 'widget-title' },
          h('span', { class: 'widget-title-text' }, w.title || w.query_name || 'Widget'),
          h('button', { type: 'button', class: 'btn-link', 'aria-label': 'Remove widget',
                        onClick: () => this.props.onDelete(w.id) }, '×'),
        ),
        h('div', { class: 'widget-content widget-loading', id: `widget-content-${w.id}` }, 'Loading...'),
      );
      grid.appendChild(card);
    });

    return grid;
  }

  // Remove a single widget card from the DOM (optimistic delete — no full re-render).
  removeWidget(widgetId) {
    this._charts.get(widgetId)?.instance?.destroy();
    this._charts.delete(widgetId);
    this._root?.querySelector(`.widget-card[data-widget-id="${widgetId}"]`)?.remove();
    if (!this._root?.querySelector('.widget-card')) {
      // Last widget removed — show empty state.
      this.props.widgets$.set([]);
    }
  }

  _postRender() {
    const widgets = this.props.widgets$.get();
    if (!widgets.length) return;
    widgets.forEach(w => this.props.onLoadData(w, this._charts));
    this._sortable = Sortable.create(this._root, {
      animation:  150,
      ghostClass: 'widget-card--ghost',
      handle:     '.widget-title',
      onEnd: ({ item, newIndex }) => this.props.onReorder(item.dataset.widgetId, newIndex),
    });
  }

  _destroyCharts() {
    this._charts.forEach(ref => ref.instance?.destroy());
    this._charts.clear();
  }
}
