// ===== Application Bootstrap =====
// Sole responsibility: initialise modules and start the app.
// If logic is tempting to add here, it belongs in a feature instead.
import { Modal } from './ui/modal.js';
import { Router } from './core/router.js';
import { AuthFeature } from './features/auth.js';
import { EditorFeature } from './features/editor.js';
import { ConnectionsFeature } from './features/connections.js';
import { QueriesFeature } from './features/queries.js';
import { SchedulesFeature } from './features/schedules.js';
import { DashboardFeature } from './features/dashboard.js';
import { WidgetsFeature } from './features/widgets.js';

document.addEventListener('DOMContentLoaded', () => {

  // Infrastructure
  Modal.init();
  Router.init(); // wire browser back/forward buttons

  // Each feature registers its own DOM events and Router.onEnter hooks.
  AuthFeature.init();
  EditorFeature.init();
  ConnectionsFeature.init();
  QueriesFeature.init();
  SchedulesFeature.init();
  DashboardFeature.init();
  WidgetsFeature.init();

  // Shared navigation — nav links and back buttons are not owned by any single feature.
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => { e.preventDefault(); Router.navigate(item.dataset.page); });
  });
  document.querySelectorAll('.back-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); Router.navigate(btn.dataset.page); });
  });

  // Sidebar toggle — persist state across page refreshes.
  const _sidebar = document.getElementById('sidebar');
  if (localStorage.getItem('sidebar:collapsed') === '1') _sidebar.classList.add('collapsed');
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const collapsed = _sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
  });

  // Kick off auth check — this is the single entry point for the app.
  AuthFeature.tryAutoLogin();
});
