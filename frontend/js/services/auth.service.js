// ===== Auth Service =====
import { Http } from '../core/http.js';

export const AuthService = {
  login:    (email, password)       => Http.post('/auth/login',    { email, password }),
  register: (name, email, password) => Http.post('/auth/register', { name, email, password }),
  me:       ()                      => Http.get('/auth/me'),
};
