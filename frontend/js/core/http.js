// ===== HTTP Client =====
// Sole responsibility: make authenticated HTTP requests.
// Has no knowledge of what resources exist — that belongs in services/.
const BASE = '/api';
const TIMEOUT_MS = 30_000;
let _token = null;

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out — check your connection and try again.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const Http = {
  setToken: (token) => { _token = token; },
  get:      (path)        => request('GET',    path),
  post:     (path, body)  => request('POST',   path, body),
  put:      (path, body)  => request('PUT',    path, body),
  delete:   (path)        => request('DELETE', path),
};
