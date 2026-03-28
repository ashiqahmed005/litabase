// ===== ScheduleList component =====
// props: { items$, onTrigger, onDelete }
//   items$ — signal<null | Schedule[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { h } from '../core/dom.js';

export class ScheduleList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = h('ul', { class: 'list', role: 'list' });

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('◷', 'No scheduled reports yet.')); return ul; }

    items.forEach(s => {
      const recipientsSub = `Dashboard: ${s.dashboard_name || ''} · Cron: ${s.cron_expression} · Recipients: ${s.recipients.join(', ')}`;
      ul.appendChild(
        h('li', { class: 'list-item', role: 'listitem' },
          h('div', { class: 'list-item-main' },
            h('div', { class: 'list-item-title' },
              h('span', { class: 'sched-name' }, s.name),
              h('span', { class: `badge badge--inline ${s.is_active ? 'badge-success' : 'badge-danger'}` },
                s.is_active ? 'Active' : 'Paused',
              ),
            ),
            h('div', { class: 'list-item-sub' }, recipientsSub),
          ),
          h('div', { class: 'list-item-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', onClick: () => this.props.onTrigger(s.id) }, 'Run Now'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger',    onClick: () => this.props.onDelete(s.id) },  'Delete'),
          ),
        ),
      );
    });

    return ul;
  }
}
