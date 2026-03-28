import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '../../js/ui/toast.js';

function setupContainer() {
  const c = document.createElement('div');
  c.id    = 'toast-container';
  document.body.appendChild(c);
  return c;
}

beforeEach(() => {
  document.body.innerHTML = '';
  setupContainer();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

// ─────────────────────────────────────────────────────────────────────────────
describe('Toast.show()', () => {
  it('appends a toast element to #toast-container', () => {
    Toast.show('Hello');
    expect(document.querySelectorAll('.toast').length).toBe(1);
  });

  it('sets the toast message as textContent', () => {
    Toast.show('Something happened');
    expect(document.querySelector('.toast').textContent).toBe('Something happened');
  });

  it('applies the correct type class', () => {
    Toast.show('ok', 'success');
    expect(document.querySelector('.toast').classList.contains('toast-success')).toBe(true);
  });

  it('defaults to type "info"', () => {
    Toast.show('note');
    expect(document.querySelector('.toast').classList.contains('toast-info')).toBe(true);
  });

  it('removes the toast after 3500 ms', () => {
    Toast.show('Bye');
    expect(document.querySelectorAll('.toast').length).toBe(1);
    vi.advanceTimersByTime(3500);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('can stack multiple toasts', () => {
    Toast.show('First');
    Toast.show('Second');
    expect(document.querySelectorAll('.toast').length).toBe(2);
  });
});

describe('Toast convenience methods', () => {
  it('Toast.success() applies toast-success class', () => {
    Toast.success('Done!');
    expect(document.querySelector('.toast').classList.contains('toast-success')).toBe(true);
  });

  it('Toast.error() applies toast-error class', () => {
    Toast.error('Failed!');
    expect(document.querySelector('.toast').classList.contains('toast-error')).toBe(true);
  });

  it('Toast.info() applies toast-info class', () => {
    Toast.info('FYI');
    expect(document.querySelector('.toast').classList.contains('toast-info')).toBe(true);
  });
});
