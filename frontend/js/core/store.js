// ===== Application Store =====
// Global reactive state. Components can watch these signals directly.
import { signal, computed } from '../framework/signal.js';

const _user$        = signal(null);
const _dashboardId$ = signal(null);

export const Store = {
  // ── User ──────────────────────────────────────────────────────────────────
  user$:       _user$,
  isLoggedIn$: computed(() => _user$.get() !== null, _user$),

  getUser:    ()     => _user$.get(),
  setUser:    (user) => _user$.set(user),
  clearUser:  ()     => _user$.set(null),

  // ── Current dashboard ─────────────────────────────────────────────────────
  dashboardId$: _dashboardId$,

  getDashboardId: ()   => _dashboardId$.get(),
  setDashboardId: (id) => _dashboardId$.set(id),
};
