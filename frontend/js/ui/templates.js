// ===== Shared DOM helpers =====
// Kept minimal — list rendering has moved into component classes.
// State elements (loading/empty/error) live in ui/states.js.

// Fills a <select> without innerHTML. valueFn/labelFn extract from each item.
export function populateSelect(selectEl, items, valueFn, labelFn) {
  selectEl.innerHTML = '';
  items.forEach(item => {
    const opt       = document.createElement('option');
    opt.value       = valueFn(item);
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
  });
}

// Re-export as namespace for callers that use Templates.populateSelect()
export const Templates = { populateSelect };
