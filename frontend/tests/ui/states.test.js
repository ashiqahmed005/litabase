import { describe, it, expect } from 'vitest';
import { loadingEl, emptyStateEl, errorStateEl } from '../../js/ui/states.js';

describe('loadingEl()', () => {
  it('returns a div with class empty-state', () => {
    expect(loadingEl().className).toBe('empty-state');
  });

  it('contains a "Loading..." text', () => {
    expect(loadingEl().textContent).toContain('Loading...');
  });
});

describe('emptyStateEl()', () => {
  it('returns a div with class empty-state', () => {
    expect(emptyStateEl('⊕', 'No items').className).toBe('empty-state');
  });

  it('renders the icon text', () => {
    const el = emptyStateEl('⊕', 'No items');
    expect(el.querySelector('.empty-icon')?.textContent).toBe('⊕');
  });

  it('renders the message text', () => {
    const el = emptyStateEl('⊕', 'Nothing here yet');
    expect(el.querySelector('p')?.textContent).toBe('Nothing here yet');
  });

  it('omits the icon element when icon is falsy', () => {
    const el = emptyStateEl('', 'No items');
    expect(el.querySelector('.empty-icon')).toBeNull();
  });

  it('renders user message as text content, not markup', () => {
    const msg = '<b>bold</b>';
    const el  = emptyStateEl('', msg);
    expect(el.querySelector('b')).toBeNull();
    expect(el.textContent).toContain(msg);
  });
});

describe('errorStateEl()', () => {
  it('returns a div with class empty-state', () => {
    expect(errorStateEl('Something went wrong').className).toBe('empty-state');
  });

  it('renders the error message as text', () => {
    const el = errorStateEl('Connection failed');
    expect(el.querySelector('p')?.textContent).toBe('Connection failed');
  });
});
