import authService from './authService.js';
import AuthUI from './authUI.js';
import { initStopwatch, fetchTodayTotal, flushPendingQueue, onStopwatchEvent } from './stopwatch.js';
import { initHistoryControls, rerenderActiveRange } from './dailyTotalsView.js';
import { initLibrary, showLibrary, onLibraryEvent } from './libraryView.js';
import { resolveBackendOrigin, setBackendOrigin, getBackendOrigin } from './checkBackend.js';
import { setActiveTabBtn } from "./common.js";

const views = {
  loading: document.getElementById('loading-view'),
  auth: document.getElementById('auth-view'),
  stopwatch: document.getElementById('stopwatch-view'),
  history: document.getElementById('daily-totals-view'),
  library: document.getElementById('library-view'),
};

const navButtons = document.querySelectorAll('.nav-btn');

let activeNavButton = "stopwatch";

function setActiveNavButton(navButtonTabName) {
  activeNavButton = navButtonTabName;
}

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
  if (["stopwatch", "history", "library"].includes(name)) {
    setActiveNavButton(name);
    setActiveTabBtn(navButtons, name);
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

function onUserReady(justLoggedIn = false) {
  if (justLoggedIn) fetchTodayTotal();
  initStopwatch(authService.stopwatchStartTime);
  flushPendingQueue();
  initHistoryControls();
  initLibrary();
  initSSE();
}

function initSSE() {
  const evtSource = new EventSource(`${getBackendOrigin()}/session/events`, { withCredentials: true })

  evtSource.onmessage = (event) => {
    const { type, payload } = JSON.parse(event.data)
    if (type === 'stopwatch') onStopwatchEvent(payload);
    if (type === 'library') onLibraryEvent();
  }
}

// Init auth UI — delegates login/register/logout handling
new AuthUI({
  onAuthenticated: (user) => {
    showApp(user);
    onUserReady(true);
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
    onUserReady();
  } else {
    showAuth();
  }
})();
