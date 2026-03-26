// ===== ConnectionList component =====
// props: { items$, onTest, onDelete }
//   items$ — signal<null | Connection[]>  (null = loading)
import { Component } from '../framework/component.js';
import { loadingEl, emptyStateEl } from '../ui/states.js';

export class ConnectionList extends Component {
  onMount() {
    this.watch(this.props.items$);
  }

  render() {
    const items = this.props.items$.get();
    const ul = document.createElement('ul');
    ul.className = 'list';
    ul.setAttribute('role', 'list');

    if (items === null) { ul.appendChild(loadingEl()); return ul; }
    if (!items.length)  { ul.appendChild(emptyStateEl('⊕', 'No connections yet.')); return ul; }

    items.forEach(conn => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.setAttribute('role', 'listitem');
      li.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title"></div>
          <div class="list-item-sub"></div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="btn btn-sm btn-secondary">Test</button>
          <button type="button" class="btn btn-sm btn-danger">Delete</button>
        </div>`;
      li.querySelector('.list-item-title').textContent = conn.name;
      li.querySelector('.list-item-sub').textContent   = `${conn.type} · ${conn.host || conn.database_name || ''}`;
      li.querySelectorAll('button')[0].addEventListener('click', () => this.props.onTest(conn.id));
      li.querySelectorAll('button')[1].addEventListener('click', () => this.props.onDelete(conn.id));
      ul.appendChild(li);
    });

    return ul;
  }
}
