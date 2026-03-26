// ===== ScheduleList component =====
// props: { items$, onTrigger, onDelete }
//   items$ — signal<null | Schedule[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';

export class ScheduleList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = document.createElement('ul');
    ul.className = 'list';
    ul.setAttribute('role', 'list');

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('◷', 'No scheduled reports yet.')); return ul; }

    items.forEach(s => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.setAttribute('role', 'listitem');
      li.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title">
            <span class="sched-name"></span>
            <span class="badge badge--inline"></span>
          </div>
          <div class="list-item-sub"></div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="btn btn-sm btn-secondary">Run Now</button>
          <button type="button" class="btn btn-sm btn-danger">Delete</button>
        </div>`;

      li.querySelector('.sched-name').textContent  = s.name;
      const badge = li.querySelector('.badge');
      badge.textContent = s.is_active ? 'Active' : 'Paused';
      badge.className   = `badge badge--inline ${s.is_active ? 'badge-success' : 'badge-danger'}`;
      li.querySelector('.list-item-sub').textContent =
        `Dashboard: ${s.dashboard_name || ''} · Cron: ${s.cron_expression} · Recipients: ${s.recipients.join(', ')}`;

      li.querySelectorAll('button')[0].addEventListener('click', () => this.props.onTrigger(s.id));
      li.querySelectorAll('button')[1].addEventListener('click', () => this.props.onDelete(s.id));
      ul.appendChild(li);
    });

    return ul;
  }
}
