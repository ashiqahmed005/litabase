// ===== Dashboard Service =====
import { Http } from '../core/http.js';

export const DashboardService = {
  list:         ()              => Http.get('/dashboards'),
  get:          (id)            => Http.get(`/dashboards/${id}`),
  create:       (data)          => Http.post('/dashboards', data),
  update:       (id, data)      => Http.put(`/dashboards/${id}`, data),
  delete:       (id)            => Http.delete(`/dashboards/${id}`),
  addWidget:    (id, data)      => Http.post(`/dashboards/${id}/widgets`, data),
  updateWidget: (id, wId, data) => Http.put(`/dashboards/${id}/widgets/${wId}`, data),
  deleteWidget: (id, wId)       => Http.delete(`/dashboards/${id}/widgets/${wId}`),
};
