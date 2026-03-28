// ===== QueryList component =====
// props: { items$, onOpen, onDelete }
//   items$ — signal<null | Query[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { Utils } from '../core/utils.js';
import { h } from '../core/dom.js';

export class QueryList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = h('ul', { class: 'list', role: 'list' });

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('⊙', 'No saved queries yet.')); return ul; }

    items.forEach(q => {
      ul.appendChild(
        h('li', { class: 'list-item', role: 'listitem' },
          h('div', { class: 'list-item-main' },
            h('div', { class: 'list-item-title' }, q.name),
            h('div', { class: 'list-item-sub' }, `${q.connection_name || ''} · ${Utils.formatDate(q.updated_at)}`),
          ),
          h('div', { class: 'list-item-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', onClick: () => this.props.onOpen(q.id) },   'Open in Editor'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger',    onClick: () => this.props.onDelete(q.id) }, 'Delete'),
          ),
        ),
      );
    });

    return ul;
  }
}
