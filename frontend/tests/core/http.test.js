import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Http is a module-level singleton with mutable token state.
// Re-import after resetModules so each describe block starts clean.
let Http;

function mockFetch(overrides = {}) {
  const defaults = { ok: true, status: 200, json: async () => ({}) };
  const response = { ...defaults, ...overrides };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

beforeEach(async () => {
  vi.resetModules();
  ({ Http } = await import('../../js/core/http.js'));
});

afterEach(() => vi.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('Http — request routing', () => {
  it('GET sends to /api/<path>', async () => {
    mockFetch();
    await Http.get('/users');
    expect(fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'GET' }));
  });

  it('POST sends to /api/<path> with body', async () => {
    mockFetch({ json: async () => ({ id: 1 }) });
    await Http.post('/items', { name: 'test' });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/items');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('PUT sends correct method', async () => {
    mockFetch();
    await Http.put('/items/1', { name: 'updated' });
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
  });

  it('DELETE sends correct method without body', async () => {
    mockFetch();
    await Http.delete('/items/1');
    const opts = fetch.mock.calls[0][1];
    expect(opts.method).toBe('DELETE');
    expect(opts.body).toBeUndefined();
  });

  it('returns the parsed JSON response body', async () => {
    mockFetch({ json: async () => ({ name: 'Alice' }) });
    const data = await Http.get('/me');
    expect(data).toEqual({ name: 'Alice' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Http — authentication', () => {
  it('includes Authorization header when a token is set', async () => {
    mockFetch();
    Http.setToken('secret-token');
    await Http.get('/secure');
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer secret-token');
  });

  it('omits Authorization header when no token is set', async () => {
    mockFetch();
    await Http.get('/open');
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('clears the token when setToken(null) is called', async () => {
    mockFetch();
    Http.setToken('old-token');
    Http.setToken(null);
    await Http.get('/open');
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Http — error handling', () => {
  it('throws with the server error message on a non-OK response', async () => {
    mockFetch({ ok: false, status: 400, json: async () => ({ error: 'Bad request' }) });
    await expect(Http.get('/fail')).rejects.toThrow('Bad request');
  });

  it('falls back to "HTTP <status>" when the error body has no message', async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) });
    await expect(Http.get('/fail')).rejects.toThrow('HTTP 500');
  });

  it('attaches the HTTP status code to the thrown error', async () => {
    mockFetch({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) });
    const err = await Http.get('/auth').catch(e => e);
    expect(err.status).toBe(401);
  });

  it('converts an AbortError into a human-readable timeout message', async () => {
    const abortErr = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    await expect(Http.get('/slow')).rejects.toThrow(/timed out/i);
  });

  it('re-throws non-abort network errors unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    await expect(Http.get('/broken')).rejects.toThrow('Failed to fetch');
  });

  it('handles a response body that cannot be parsed as JSON', async () => {
    mockFetch({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad json'); } });
    // Falls back to empty object → no error.message → "HTTP 502"
    await expect(Http.get('/broken')).rejects.toThrow('HTTP 502');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Http — timeout / AbortController', () => {
  it('passes a signal to fetch (for timeout support)', async () => {
    mockFetch();
    await Http.get('/anything');
    const opts = fetch.mock.calls[0][1];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('passes Content-Type: application/json on every request', async () => {
    mockFetch();
    await Http.get('/anything');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
});
