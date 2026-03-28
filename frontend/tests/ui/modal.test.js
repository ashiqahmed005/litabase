import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Modal } from '../../js/ui/modal.js';

// Build the minimal DOM structure the Modal module expects.
function setupModal() {
  document.body.innerHTML = `
    <dialog id="modal">
      <div class="modal-header">
        <h2 id="modal-title"></h2>
        <button id="modal-close-btn">×</button>
      </div>
      <div id="modal-body"></div>
    </dialog>
  `;
  // jsdom does not implement showModal() / close() natively — stub them.
  const dialog = document.getElementById('modal');
  dialog.showModal = vi.fn();
  dialog.close     = vi.fn();
  return dialog;
}

beforeEach(() => { setupModal(); });

// ─────────────────────────────────────────────────────────────────────────────
describe('Modal.open()', () => {
  it('sets the modal title', () => {
    Modal.open('My Title', document.createElement('div'));
    expect(document.getElementById('modal-title').textContent).toBe('My Title');
  });

  it('appends the contentEl to the modal body', () => {
    const content = document.createElement('p');
    content.className = 'my-content';
    Modal.open('Test', content);
    expect(document.getElementById('modal-body').querySelector('.my-content')).not.toBeNull();
  });

  it('clears the previous modal body before inserting new content', () => {
    Modal.open('First',  document.createElement('div'));
    Modal.open('Second', document.createElement('span'));
    expect(document.getElementById('modal-body').children.length).toBe(1);
    expect(document.getElementById('modal-body').firstElementChild.tagName).toBe('SPAN');
  });

  it('calls showModal() on the dialog element', () => {
    Modal.open('Open', document.createElement('div'));
    expect(document.getElementById('modal').showModal).toHaveBeenCalledOnce();
  });

  it('auto-wires [data-dismiss="modal"] buttons to close the modal', () => {
    const content = document.createElement('div');
    const btn = document.createElement('button');
    btn.setAttribute('data-dismiss', 'modal');
    content.appendChild(btn);

    Modal.open('Dismiss test', content);
    btn.click();
    expect(document.getElementById('modal').close).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Modal.close()', () => {
  it('calls close() on the dialog element', () => {
    Modal.close();
    expect(document.getElementById('modal').close).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Modal.confirm()', () => {
  it('opens the modal with the given title', () => {
    Modal.confirm({ title: 'Confirm Delete', message: 'Are you sure?', onConfirm: vi.fn() });
    expect(document.getElementById('modal-title').textContent).toBe('Confirm Delete');
  });

  it('renders the message as text (XSS safe)', () => {
    const msg = '<b>dangerous</b>';
    Modal.confirm({ title: 'T', message: msg, onConfirm: vi.fn() });
    const p = document.querySelector('.confirm-message');
    expect(p.textContent).toBe(msg);
    expect(p.querySelector('b')).toBeNull();
  });

  it('renders a Cancel button that closes the modal', () => {
    Modal.confirm({ title: 'T', message: 'M', onConfirm: vi.fn() });
    const cancel = [...document.querySelectorAll('button')]
      .find(b => b.textContent === 'Cancel');
    expect(cancel).not.toBeUndefined();
    cancel.click();
    expect(document.getElementById('modal').close).toHaveBeenCalledOnce();
  });

  it('renders a confirm button with the custom label', () => {
    Modal.confirm({ title: 'T', message: 'M', confirmLabel: 'Remove', onConfirm: vi.fn() });
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent === 'Remove');
    expect(btn).not.toBeUndefined();
  });

  it('confirm button calls onConfirm and closes the modal', () => {
    const onConfirm = vi.fn();
    Modal.confirm({ title: 'T', message: 'M', confirmLabel: 'Delete', onConfirm });
    const confirmBtn = [...document.querySelectorAll('button')]
      .find(b => b.textContent === 'Delete');
    confirmBtn.click();
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(document.getElementById('modal').close).toHaveBeenCalledOnce();
  });

  it('uses "Confirm" as the default button label', () => {
    Modal.confirm({ title: 'T', message: 'M', onConfirm: vi.fn() });
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent === 'Confirm');
    expect(btn).not.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Modal.init()', () => {
  it('wires the close button to Modal.close', () => {
    Modal.init();
    document.getElementById('modal-close-btn').click();
    expect(document.getElementById('modal').close).toHaveBeenCalledOnce();
  });
});
