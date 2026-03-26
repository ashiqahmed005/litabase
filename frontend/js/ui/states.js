// ===== Shared UI state elements =====
// Pure DOM helpers — no framework dependency, safe to call from any component.

export function loadingEl() {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  wrap.appendChild(Object.assign(document.createElement('p'), { textContent: 'Loading...' }));
  return wrap;
}

export function emptyStateEl(icon, message) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  if (icon) {
    wrap.appendChild(Object.assign(document.createElement('div'), {
      className: 'empty-icon', textContent: icon,
    }));
  }
  wrap.appendChild(Object.assign(document.createElement('p'), { textContent: message }));
  return wrap;
}

export function errorStateEl(message) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const p = Object.assign(document.createElement('p'), { textContent: message });
  p.style.color = 'var(--danger)';
  wrap.appendChild(p);
  return wrap;
}
