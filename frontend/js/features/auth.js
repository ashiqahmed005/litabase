// ===== Auth Feature =====
import { Http } from '../core/http.js';
import { Store } from '../core/store.js';
import { Router } from '../core/router.js';
import { Events } from '../framework/events.js';
import { AuthService } from '../services/auth.service.js';

export const AuthFeature = {

  async tryAutoLogin() {
    const token = localStorage.getItem('litabase_token');
    if (!token) { AuthFeature._showAuthScreen(); return; }
    Http.setToken(token);
    try {
      Store.setUser(await AuthService.me());
      AuthFeature._showApp();
    } catch(e) {
      localStorage.removeItem('litabase_token');
      AuthFeature._showAuthScreen();
    }
  },

  _showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    // Clear the hash so the URL doesn't expose a page name on the login screen.
    history.replaceState(null, '', location.pathname);
    Events.emit('auth:logout');
  },

  _showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    // Respect whatever page the URL hash points to (e.g. user refreshed on /connections).
    Router.start('dashboards');
    Events.emit('auth:login', Store.getUser());
  },

  _logout() {
    localStorage.removeItem('litabase_token');
    Http.setToken(null);
    Store.clearUser();
    AuthFeature._showAuthScreen();
  },

  init() {
    // Reactively keep the username display in sync with Store.user$
    Store.user$.subscribe(user => {
      const el = document.getElementById('user-name');
      if (el) el.textContent = user?.name ?? '';
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-form`).classList.remove('hidden');
      });
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await AuthService.login(
          document.getElementById('login-email').value,
          document.getElementById('login-password').value,
        );
        localStorage.setItem('litabase_token', res.token);
        Http.setToken(res.token);
        Store.setUser(res.user);
        AuthFeature._showApp();
      } catch(err) {
        document.getElementById('login-error').textContent = err.message;
      }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await AuthService.register(
          document.getElementById('reg-name').value,
          document.getElementById('reg-email').value,
          document.getElementById('reg-password').value,
        );
        localStorage.setItem('litabase_token', res.token);
        Http.setToken(res.token);
        Store.setUser(res.user);
        AuthFeature._showApp();
      } catch(err) {
        document.getElementById('register-error').textContent = err.message;
      }
    });

    document.getElementById('logout-btn').addEventListener('click', AuthFeature._logout);
  },
};
