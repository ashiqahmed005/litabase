// ===== QueryList component =====
// props: { items$, onOpen, onDelete }
//   items$ — signal<null | Query[]>
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';
import { Utils } from '../core/utils.js';

export class QueryList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = document.createElement('ul');
    ul.className = 'list';
    ul.setAttribute('role', 'list');

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('⊙', 'No saved queries yet.')); return ul; }

    items.forEach(q => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.setAttribute('role', 'listitem');
      li.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title"></div>
          <div class="list-item-sub"></div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="btn btn-sm btn-secondary">Open in Editor</button>
          <button type="button" class="btn btn-sm btn-danger">Delete</button>
        </div>`;
      li.querySelector('.list-item-title').textContent = q.name;
      li.querySelector('.list-item-sub').textContent   = `${q.connection_name || ''} · ${Utils.formatDate(q.updated_at)}`;
      li.querySelectorAll('button')[0].addEventListener('click', () => this.props.onOpen(q.id));
      li.querySelectorAll('button')[1].addEventListener('click', () => this.props.onDelete(q.id));
      ul.appendChild(li);
    });

    return ul;
  }
}
