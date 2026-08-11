import { setTodayTotalMs, addTodayTotalMs, getTodayTotalMs } from './todayState.js';
import { getBackendOrigin } from './checkBackend.js';
import authService from './authService.js';

const PENDING_KEY = 'stopwatch:pending';
const TICK_INTERVAL_MS = 250;
const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000;

let tickTimer = null;
let activeStartTime = null;
let activeStartTzOffset = null;

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDurationHuman(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function getDisplayEl() { return document.getElementById('stopwatch-display'); }
function getStartBtn() { return document.getElementById('start-btn'); }
function getStopBtn() { return document.getElementById('stop-btn'); }
function getToastEl() { return document.getElementById('stopwatch-toast'); }
function getTodayTotalEl() { return document.getElementById('today-total'); }
function getTodayTotalValueEl() { return document.getElementById('today-total-value'); }

function renderTodayTotal() {
  const totalSec = Math.floor(getTodayTotalMs() / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  getTodayTotalValueEl().textContent = parts.join(' ');
  getTodayTotalEl().hidden = false;
}

export async function fetchTodayTotal() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const response = await fetch(`${getBackendOrigin()}/intervals/daily-totals`, {
      credentials: 'include'
    });
    if (!response.ok) return;
    const data = await response.json();
    const todayRow = data.find(r => r.bucket_key === todayStr);
    setTodayTotalMs(todayRow ? todayRow.total_ms : 0);
    renderTodayTotal();
  } catch {
    // silently ignore — the today total is non-critical
  }
}

function tick(startTime) {
  const elapsed = Date.now() - startTime;
  getDisplayEl().textContent = formatDuration(elapsed);
}

function enterRunningState(startTime, tzOffset) {
  // We have added Server-Side Events, due to this the method will be called twice
  // in the tab where the stopwatch is started once from the click handler and another from the
  // SSE handler
  if (activeStartTime) return;
  activeStartTime = startTime;
  activeStartTzOffset = tzOffset ?? new Date().getTimezoneOffset();
  getStartBtn().hidden = true;
  getStopBtn().hidden = false;
  clearInterval(tickTimer);
  tickTimer = setInterval(() => tick(startTime), TICK_INTERVAL_MS);
  tick(startTime);
}

function enterIdleState() {
  // Same story as for enterRunningState method
  if (!activeStartTime) return;
  activeStartTime = null;
  activeStartTzOffset = null;
  clearInterval(tickTimer);
  tickTimer = null;
  getStartBtn().hidden = false;
  getStopBtn().hidden = true;
  getDisplayEl().textContent = '00:00:00';
}

function showToast(message) {
  const toast = getToastEl();
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

function loadPendingQueue() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingQueue(queue) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

async function postInterval(payload) {
  const response = await fetch(`${getBackendOrigin()}/intervals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return response.ok;
}

function syncStopwatchStarted(startTime) {
  updateSessionStopwatchState({ start_time: startTime ?? null })
}

/**
 * If this is called without the durationMs parameter, it means that we do not want to update
 * the local total.
 * @param {*} durationMs 
 */
function syncStopwatchStopped(durationMs) {
  updateSessionStopwatchState({ start_time: null, duration_ms: durationMs ?? null })
}

function updateSessionStopwatchState(body) {
  fetch(`${getBackendOrigin()}/session/stopwatch-state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  }).catch(() => {});
}

function showStaleSessionDialog(startTime) {
  const durationMs = Date.now() - startTime;
  const dialog = document.getElementById('stale-session-dialog');
  document.getElementById('stale-session-message').textContent =
    `Your stopwatch has been running for ${formatDurationHuman(durationMs)}. Was this intentional?`;

  dialog.showModal();

  document.getElementById('stale-session-save').onclick = async () => {
    dialog.close();
    const endTime = Date.now();
    const payload = {
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      start_tz_offset_min: new Date(startTime).getTimezoneOffset(),
      end_tz_offset_min: new Date().getTimezoneOffset()
    };
    const ok = await postInterval(payload);
    if (ok) {
      addTodayTotalMs(endTime - startTime);
      renderTodayTotal();
      showToast(`Saved ${formatDurationHuman(durationMs)}`);
    } else {
      showToast('Could not save — try again later.');
    }
    syncStopwatchStopped(durationMs);
    enterIdleState();
  };

  document.getElementById('stale-session-discard').onclick = () => {
    dialog.close();
    syncStopwatchStopped(null);
    enterIdleState();
  };

  document.getElementById('stale-session-continue').onclick = () => {
    dialog.close();
    enterRunningState(startTime);
  };
}

export async function flushPendingQueue() {
  const queue = loadPendingQueue();
  if (queue.length === 0) return;
  const currentUserId = authService.user?.id;
  if (!currentUserId) return;
  const remaining = [];
  for (const item of queue) {
    if (item.userId !== currentUserId) {
      remaining.push(item);
      continue;
    }
    const { userId: _, ...payload } = item;
    const ok = await postInterval(payload);
    if (!ok) remaining.push(item);
    else {
      addTodayTotalMs(new Date(payload.end_time) - new Date(payload.start_time));
    }
  }
  savePendingQueue(remaining);
}

export function initStopwatch(sessionStopwatchStartTime) {
  const startBtn = getStartBtn();
  const stopBtn = getStopBtn();

  if (sessionStopwatchStartTime) {
    const startTime = new Date(sessionStopwatchStartTime).getTime();
    if (Date.now() - startTime > STALE_THRESHOLD_MS) {
      showStaleSessionDialog(startTime);
    } else {
      enterRunningState(startTime);
    }
  }

  startBtn.addEventListener('click', () => {
    const startTime = Date.now();
    syncStopwatchStarted(new Date(startTime).toISOString());
    enterRunningState(startTime);
  });

  stopBtn.addEventListener('click', async () => {
    if (!activeStartTime) return;

    const startTime = activeStartTime;
    const startTzOffset = activeStartTzOffset;
    const endTime = Date.now();
    const endTzOffset = new Date().getTimezoneOffset();
    const durationMs = endTime - startTime;

    enterIdleState();

    // Optimistic update — show the new total immediately
    addTodayTotalMs(durationMs);
    renderTodayTotal();

    const payload = {
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      start_tz_offset_min: startTzOffset,
      end_tz_offset_min: endTzOffset
    };

    try {
      const [ok] = await Promise.all([
        postInterval(payload),
        syncStopwatchStopped(durationMs)
      ]);
      if (ok) {
        showToast(`Saved ${formatDurationHuman(durationMs)}`);
        flushPendingQueue();
      } else {
        const queue = loadPendingQueue();
        queue.push({ userId: authService.user?.id, ...payload });
        savePendingQueue(queue);
        showToast(`Saved locally — will sync when back online.`);
      }
    } catch {
      const queue = loadPendingQueue();
      queue.push({ userId: authService.user?.id, ...payload });
      savePendingQueue(queue);
      showToast(`Saved locally — will sync when back online.`);
    }
  });
}

export function onStopwatchEvent(payload) {
  if (payload.startTime) {
    // We have added Server-Side Events, due to this the method will be called twice
    // in the tab where the stopwatch is started once from the click handler and another from the
    // SSE handler
    if (activeStartTime) return;
    enterRunningState(new Date(payload.startTime).getTime())
  } else {
    if (!activeStartTime) return;
    if (payload.durationMs) {
      addTodayTotalMs(payload.durationMs)
      renderTodayTotal()
    }
    enterIdleState()
  }
}