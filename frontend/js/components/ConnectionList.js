// ===== ConnectionList component =====
// props: { items$, onTest, onDelete }
//   items$ — signal<null | Connection[]>  (null = loading)
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { h } from '../core/dom.js';

export class ConnectionList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = h('ul', { class: 'list', role: 'list' });

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('⊕', 'No connections yet.')); return ul; }

    items.forEach(conn => {
      ul.appendChild(
        h('li', { class: 'list-item', role: 'listitem' },
          h('div', { class: 'list-item-main' },
            h('div', { class: 'list-item-title' }, conn.name),
            h('div', { class: 'list-item-sub' }, `${conn.type} · ${conn.host || conn.database_name || ''}`),
          ),
          h('div', { class: 'list-item-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', onClick: () => this.props.onTest(conn.id) }, 'Test'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger',    onClick: () => this.props.onDelete(conn.id) }, 'Delete'),
          ),
        ),
      );
    });

    return ul;
  }
}
