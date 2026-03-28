// ===== DOM Builder =====
// The only safe way to construct dynamic HTML in this codebase.
// All text content reaches the DOM via textContent — never innerHTML.
//
// Usage:
//   h('div', { class: 'card', id: 'my-id' }, 'Hello', childEl)
//   h('button', { type: 'button', onClick: handler }, 'Click me')
//   h('label', { for: 'input-id' }, 'Label text')
//
// Attribute rules:
//   class   → el.className
//   for     → el.htmlFor
//   on*     → addEventListener  (e.g. onClick → 'click', onChange → 'change')
//   others  → el.setAttribute
//
// Children: Node → appended, string/number → text node, null/undefined → skipped.
// Arrays are flattened, so you can spread or pass conditional arrays.

/**
 * @param {string} tag
 * @param {Record<string, string|number|Function|null>} [attrs]
 * @param {...(Node|string|number|null|undefined|Array)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (val == null) continue;
    if (key === 'class') {
      el.className = val;
    } else if (key === 'for') {
      el.htmlFor = val;
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, String(val));
    }
  }

  children.flat(Infinity).forEach(child => {
    if (child == null) return;
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });

  return el;
}
