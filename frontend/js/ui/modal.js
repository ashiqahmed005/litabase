// ===== Modal Manager =====
// Uses the native <dialog> element for built-in: focus trapping,
// ESC key handling, ::backdrop, and aria-modal semantics.
export const Modal = {
  open(title, contentEl) {
    const dialog = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    body.appendChild(contentEl);
    // Auto-wire any cancel/dismiss button so templates need no inline handlers.
    body.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', Modal.close);
    });
    dialog.showModal();
  },

  close() {
    document.getElementById('modal').close();
  },

  // Called once from app.js — wires the close button and backdrop click.
  init() {
    const dialog = document.getElementById('modal');
    document.getElementById('modal-close-btn').addEventListener('click', Modal.close);
    // Click on the ::backdrop area (the dialog element itself, outside its content)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) Modal.close();
    });
    // ESC key is handled natively by <dialog> — no listener needed.
  },
};
