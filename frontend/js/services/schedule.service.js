// ===== Schedule Service =====
import { Http } from '../core/http.js';

export const ScheduleService = {
  list:   ()          => Http.get('/schedules'),
  create: (data)      => Http.post('/schedules', data),
  update: (id, data)  => Http.put(`/schedules/${id}`, data),
  delete: (id)        => Http.delete(`/schedules/${id}`),
  run:    (id)        => Http.post(`/schedules/${id}/run`),
};
