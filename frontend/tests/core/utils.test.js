import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Utils } from '../../js/core/utils.js';

// ─────────────────────────────────────────────────────────────────────────────
describe('Utils.formatDate()', () => {
  it('formats a valid ISO date string', () => {
    expect(Utils.formatDate('2024-03-15T10:00:00Z')).toBe('Mar 15, 2024');
  });

  it('handles date-only strings', () => {
    expect(Utils.formatDate('2025-01-01')).toBe('Jan 1, 2025');
  });

  it('returns empty string for null', () => {
    expect(Utils.formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(Utils.formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(Utils.formatDate('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Utils.fromNow()', () => {
  it('returns empty string for null', () => {
    expect(Utils.fromNow(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(Utils.fromNow(undefined)).toBe('');
  });

  it('returns a non-empty relative string for a recent date', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const result = Utils.fromNow(oneMinuteAgo);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Utils.debounce()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(()  => vi.useRealTimers());

  it('does not invoke fn immediately', () => {
    const spy = vi.fn();
    Utils.debounce(spy, 300)();
    expect(spy).not.toHaveBeenCalled();
  });

  it('invokes fn after the specified delay', () => {
    const spy       = vi.fn();
    const debounced = Utils.debounce(spy, 300);
    debounced();
    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('resets the timer on each call (trailing edge)', () => {
    const spy       = vi.fn();
    const debounced = Utils.debounce(spy, 300);

    debounced();
    vi.advanceTimersByTime(200); // 200ms elapsed
    debounced();                 // reset — starts fresh from here
    vi.advanceTimersByTime(200); // only 200ms since last call
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100); // now 300ms since last call
    expect(spy).toHaveBeenCalledOnce();
  });

  it('invokes fn only once for rapid successive calls', () => {
    const spy       = vi.fn();
    const debounced = Utils.debounce(spy, 300);
    for (let i = 0; i < 10; i++) debounced();
    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('passes all arguments through to fn', () => {
    const spy       = vi.fn();
    const debounced = Utils.debounce(spy, 100);
    debounced('hello', 42, true);
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledWith('hello', 42, true);
  });

  it('uses 300 ms as the default delay', () => {
    const spy       = vi.fn();
    const debounced = Utils.debounce(spy); // no explicit delay
    debounced();
    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Utils.exportCsv()', () => {
  let capturedBlob;

  beforeEach(() => {
    capturedBlob = null;
    vi.stubGlobal('URL', {
      createObjectURL: (blob) => { capturedBlob = blob; return 'blob:fake'; },
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('produces correct CSV header and rows', async () => {
    Utils.exportCsv(['name', 'score'], [['Alice', 42], ['Bob', 99]]);
    expect(await capturedBlob.text()).toBe('name,score\nAlice,42\nBob,99');
  });

  it('wraps cells containing commas in double-quotes', async () => {
    Utils.exportCsv(['col'], [['hello, world']]);
    expect(await capturedBlob.text()).toContain('"hello, world"');
  });

  it('escapes double-quotes inside cells with doubled quotes (RFC 4180)', async () => {
    Utils.exportCsv(['col'], [['say "hi"']]);
    expect(await capturedBlob.text()).toContain('"say ""hi"""');
  });

  it('wraps cells containing newlines', async () => {
    Utils.exportCsv(['col'], [['line1\nline2']]);
    expect(await capturedBlob.text()).toContain('"line1\nline2"');
  });

  it('replaces null cells with an empty string', async () => {
    Utils.exportCsv(['a', 'b'], [[null, 'ok']]);
    const text = await capturedBlob.text();
    expect(text).toBe('a,b\n,ok');
  });

  it('uses "export.csv" as the default filename', () => {
    const anchor = Object.assign(document.createElement('a'), { click: vi.fn() });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
    Utils.exportCsv(['x'], [['1']]);
    expect(anchor.download).toBe('export.csv');
  });

  it('uses the provided filename', () => {
    const anchor = Object.assign(document.createElement('a'), { click: vi.fn() });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
    Utils.exportCsv(['x'], [['1']], 'report.csv');
    expect(anchor.download).toBe('report.csv');
  });

  it('revokes the object URL after triggering download', () => {
    Utils.exportCsv(['x'], [['1']]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
