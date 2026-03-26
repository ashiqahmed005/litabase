// ===== Query Service =====
import { Http } from '../core/http.js';

export const QueryService = {
  list:     ()             => Http.get('/queries'),
  get:      (id)           => Http.get(`/queries/${id}`),
  run:      (connId, sql)  => Http.post('/queries/run', { connection_id: connId, sql }),
  runSaved: (id)           => Http.post(`/queries/${id}/run`),
  create:   (data)         => Http.post('/queries', data),
  update:   (id, data)     => Http.put(`/queries/${id}`, data),
  delete:   (id)           => Http.delete(`/queries/${id}`),
};
