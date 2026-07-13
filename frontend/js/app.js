import authService from './authService.js';
import AuthUI from './authUI.js';
import { initStopwatch, fetchTodayTotal, flushPendingQueue } from './stopwatch.js';
import { initHistoryControls, rerenderActiveRange } from './dailyTotalsView.js';
import { initLibrary, showLibrary } from './libraryView.js';
import { resolveBackendOrigin, setBackendOrigin } from './checkBackend.js';

const views = {
  loading: document.getElementById('loading-view'),
  auth: document.getElementById('auth-view'),
  stopwatch: document.getElementById('stopwatch-view'),
  history: document.getElementById('daily-totals-view'),
  library: document.getElementById('library-view'),
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

function showApp(user) {
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('app-header').hidden = false;
  showView('stopwatch');
}

function showAuth() {
  document.getElementById('app-header').hidden = true;
  showView('auth');
}

// Nav buttons
document.getElementById('nav-stopwatch').addEventListener('click', () => showView('stopwatch'));
document.getElementById('nav-history').addEventListener('click', () => {
  showView('history');
  rerenderActiveRange();
});
document.getElementById('nav-library').addEventListener('click', () => {
  showView('library');
  showLibrary();
});

// Init auth UI — delegates login/register/logout handling
new AuthUI({
  onAuthenticated: (user) => {
    showApp(user, true);
    // After login
    fetchTodayTotal();
  },
  onLogout: () => showAuth()
});

// Bootstrap
(async () => {
  showView('loading');
  const origin = await resolveBackendOrigin();
  setBackendOrigin(origin);
  const [authenticated] = await Promise.all([authService.initialize(), fetchTodayTotal()]);
  if (authenticated) {
    showApp(authService.user);
  } else {
    showAuth();
  }
  // Push leftover intervals from earlier
  flushPendingQueue();
  initStopwatch();
  initHistoryControls();
  initLibrary();
})();
