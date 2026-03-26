// ===== Toast Notifications =====
export const Toast = {
  show(message, type = 'info') {
    const el = document.createElement('div');
    el.className   = `toast toast-${type}`;
    el.textContent = message;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error'),
  info:    (msg) => Toast.show(msg, 'info'),
};
