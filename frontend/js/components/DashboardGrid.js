// ===== DashboardGrid component =====
// props: { items$, onOpen }
//   items$ — signal<null | Dashboard[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { Utils } from '../core/utils.js';

export class DashboardGrid extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    grid.setAttribute('role', 'list');

    if (items === null) { grid.appendChild(loadingEl()); return grid; }
    if (!items.length) {
      grid.appendChild(emptyStateEl('⊞', 'No dashboards yet. Create your first!'));
      return grid;
    }

    items.forEach(d => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'listitem');
      card.dataset.id = d.id;
      card.innerHTML = `
        <div class="card-title"></div>
        <div class="card-meta"></div>
        <div class="card-footer">
          <span class="card-widget-count"></span>
          <span class="card-date"></span>
        </div>`;
      card.querySelector('.card-title').textContent        = d.name;
      card.querySelector('.card-meta').textContent         = d.description || 'No description';
      card.querySelector('.card-widget-count').textContent = `${d.widget_count} widget${d.widget_count !== 1 ? 's' : ''}`;
      card.querySelector('.card-date').textContent         = Utils.formatDate(d.updated_at);
      card.addEventListener('click', () => this.props.onOpen(d.id));
      grid.appendChild(card);
    });

    return grid;
  }
}
