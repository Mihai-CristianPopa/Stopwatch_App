import authService from './authService.js';
import AuthUI from './authUI.js';
import { initStopwatch } from './stopwatch.js';
import { initHistoryControls } from './dailyTotalsView.js';

const views = {
  auth: document.getElementById('auth-view'),
  stopwatch: document.getElementById('stopwatch-view'),
  history: document.getElementById('daily-totals-view'),
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
});

// Init auth UI — delegates login/register/logout handling
new AuthUI({
  onAuthenticated: (user) => showApp(user),
  onLogout: () => showAuth()
});

// Bootstrap
(async () => {
  const authenticated = await authService.initialize();
  if (authenticated) {
    showApp(authService.user);
  } else {
    showAuth();
  }

  // Init stopwatch (sets up event listeners, resumes if localStorage has active run)
  initStopwatch();
  initHistoryControls();
})();
