// ===== DashboardGrid component =====
// props: { items$, onOpen }
//   items$ — signal<null | Dashboard[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { Utils } from '../core/utils.js';
import { h } from '../core/dom.js';

export class DashboardGrid extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const grid = h('div', { class: 'card-grid', role: 'list' });

    if (items === null) { grid.appendChild(loadingEl()); return grid; }
    if (!items.length) {
      grid.appendChild(emptyStateEl('⊞', 'No dashboards yet. Create your first!'));
      return grid;
    }

    items.forEach(d => {
      const widgetLabel = `${d.widget_count} widget${d.widget_count !== 1 ? 's' : ''}`;
      const card = h('div', { class: 'card', role: 'listitem' },
        h('div', { class: 'card-title' }, d.name),
        h('div', { class: 'card-meta' },  d.description || 'No description'),
        h('div', { class: 'card-footer' },
          h('span', { class: 'card-widget-count' }, widgetLabel),
          h('span', { class: 'card-date' },         Utils.formatDate(d.updated_at)),
        ),
      );
      card.addEventListener('click', () => this.props.onOpen(d.id));
      grid.appendChild(card);
    });

    return grid;
  }
}
