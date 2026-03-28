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

  // Renders a safe confirmation dialog using the existing modal chrome.
  // No native confirm() — stays in the app's design system.
  confirm({ title, message, confirmLabel = 'Confirm', onConfirm }) {
    const wrap = document.createElement('div');

    const p = document.createElement('p');
    p.className = 'confirm-message';
    p.textContent = message;
    wrap.appendChild(p);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.setAttribute('data-dismiss', 'modal');
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', () => { Modal.close(); onConfirm(); });

    footer.append(cancelBtn, confirmBtn);
    wrap.appendChild(footer);
    Modal.open(title, wrap);
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
