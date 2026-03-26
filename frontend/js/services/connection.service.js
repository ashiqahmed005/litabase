// ===== Connection Service =====
// Wraps HTTP calls with a simple cache so navigating editor ↔ connections
// page doesn't fire a redundant network request for the same list.
import { Http } from '../core/http.js';

let _cache = null;

function _invalidate() { _cache = null; }

export const ConnectionService = {
  async list() {
    if (!_cache) _cache = await Http.get('/connections');
    return _cache;
  },
  async create(data) {
    const result = await Http.post('/connections', data);
    _invalidate();
    return result;
  },
  test:   (id) => Http.post(`/connections/${id}/test`),
  async delete(id) {
    await Http.delete(`/connections/${id}`);
    _invalidate();
  },
  invalidate: _invalidate,
};
