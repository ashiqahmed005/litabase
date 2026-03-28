import { describe, it, expect, vi } from 'vitest';
import { h } from '../../js/core/dom.js';

// ─────────────────────────────────────────────────────────────────────────────
describe('h() — element creation', () => {
  it('creates an element with the given tag', () => {
    expect(h('div').tagName).toBe('DIV');
    expect(h('span').tagName).toBe('SPAN');
    expect(h('ul').tagName).toBe('UL');
  });

  it('returns an HTMLElement instance', () => {
    expect(h('p') instanceof HTMLElement).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('h() — attribute handling', () => {
  it('maps "class" to className', () => {
    const el = h('div', { class: 'foo bar' });
    expect(el.className).toBe('foo bar');
  });

  it('maps "for" to htmlFor (label association)', () => {
    const label = h('label', { for: 'my-input' });
    expect(label.htmlFor).toBe('my-input');
  });

  it('sets id via setAttribute', () => {
    const el = h('input', { id: 'my-field' });
    expect(el.id).toBe('my-field');
  });

  it('sets type, placeholder, and value via setAttribute', () => {
    const el = h('input', { type: 'number', placeholder: 'Enter value', value: '42' });
    expect(el.getAttribute('type')).toBe('number');
    expect(el.getAttribute('placeholder')).toBe('Enter value');
    expect(el.getAttribute('value')).toBe('42');
  });

  it('sets data-* attributes via setAttribute', () => {
    const el = h('div', { 'data-dismiss': 'modal', 'data-id': '99' });
    expect(el.getAttribute('data-dismiss')).toBe('modal');
    expect(el.getAttribute('data-id')).toBe('99');
  });

  it('converts number attribute values to strings', () => {
    const el = h('div', { tabindex: 0 });
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('skips null attribute values entirely', () => {
    const el = h('div', { class: null, id: 'kept' });
    expect(el.className).toBe('');
    expect(el.id).toBe('kept');
  });

  it('skips undefined attribute values', () => {
    const el = h('div', { class: undefined });
    expect(el.className).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('h() — event listeners', () => {
  it('wires onClick to a click event listener', () => {
    const spy = vi.fn();
    const btn = h('button', { onClick: spy });
    btn.click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('wires onChange to a change event listener', () => {
    const spy   = vi.fn();
    const input = h('input', { onChange: spy });
    input.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('wires onInput to an input event listener', () => {
    const spy   = vi.fn();
    const input = h('input', { onInput: spy });
    input.dispatchEvent(new Event('input'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('does not treat non-function on* values as listeners', () => {
    // onX with a string value should fall through to setAttribute
    const el = h('div', { onmouseover: 'return false' });
    expect(el.getAttribute('onmouseover')).toBe('return false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('h() — children / XSS safety', () => {
  it('renders string children as text nodes, never as HTML', () => {
    const xss = '<script>alert("xss")</script>';
    const el  = h('div', {}, xss);

    expect(el.textContent).toBe(xss);          // content preserved as text
    expect(el.querySelector('script')).toBeNull(); // NOT parsed as markup
    expect(el.innerHTML).toContain('&lt;script&gt;'); // escaped in serialisation
  });

  it('renders angle brackets and quotes as plain text', () => {
    const evil = '" onmouseover="alert(1)';
    const el   = h('div', {}, evil);
    expect(el.textContent).toBe(evil);
    // Text node — no child elements means no event handler attribute was parsed
    expect(el.children.length).toBe(0);
    expect(el.querySelector('[onmouseover]')).toBeNull();
  });

  it('appends Node children directly (not serialised)', () => {
    const child  = document.createElement('em');
    child.textContent = 'emphasis';
    const parent = h('div', {}, child);
    expect(parent.firstChild).toBe(child);
    expect(parent.querySelector('em')).not.toBeNull();
  });

  it('converts number children to text nodes', () => {
    const el = h('span', {}, 42);
    expect(el.textContent).toBe('42');
  });

  it('skips null children without throwing', () => {
    const el = h('div', {}, null, 'hello', undefined, 'world');
    expect(el.childNodes.length).toBe(2);
    expect(el.textContent).toBe('helloworld');
  });

  it('flattens one level of array children', () => {
    const items = ['a', 'b', 'c'];
    const el    = h('ul', {}, items);
    expect(el.childNodes.length).toBe(3);
    expect(el.textContent).toBe('abc');
  });

  it('flattens deeply nested arrays', () => {
    const el = h('div', {}, [['x', ['y', 'z']]]);
    expect(el.childNodes.length).toBe(3);
    expect(el.textContent).toBe('xyz');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('h() — tree composition', () => {
  it('builds a two-level nested tree correctly', () => {
    const tree = h('ul', { class: 'list' },
      h('li', { class: 'item' }, 'First'),
      h('li', { class: 'item' }, 'Second'),
    );

    expect(tree.tagName).toBe('UL');
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].textContent).toBe('First');
    expect(tree.children[1].textContent).toBe('Second');
  });

  it('preserves user data as text at every nesting level', () => {
    const name = '<b>Admin</b>';
    const el   = h('div', {},
      h('span', { class: 'name' }, name),
    );
    expect(el.querySelector('span').textContent).toBe(name);
    expect(el.querySelector('b')).toBeNull();
  });

  it('supports mixed Node + string children', () => {
    const strong = document.createElement('strong');
    strong.textContent = 'bold';
    const el = h('p', {}, 'Hello ', strong, '!');

    expect(el.childNodes.length).toBe(3);
    expect(el.textContent).toBe('Hello bold!');
  });
});
