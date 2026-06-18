import { setTodayTotalMs, addTodayTotalMs, getTodayTotalMs } from './todayState.js';
import { getBackendOrigin } from './checkBackend.js';
import authService from './authService.js';

const STORAGE_KEY = 'stopwatch:active';
const PENDING_KEY = 'stopwatch:pending';
const TICK_INTERVAL_MS = 250;

let tickTimer = null;

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

async function fetchTodayTotal() {
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

function enterRunningState(startTime) {
  getStartBtn().hidden = true;
  getStopBtn().hidden = false;
  clearInterval(tickTimer);
  tickTimer = setInterval(() => tick(startTime), TICK_INTERVAL_MS);
  tick(startTime);
}

function enterIdleState() {
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

async function flushPendingQueue() {
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
  }
  savePendingQueue(remaining);
}

export function initStopwatch() {
  const startBtn = getStartBtn();
  const stopBtn = getStopBtn();

  fetchTodayTotal();
  flushPendingQueue();

  // Resume if a run was active before the page was refreshed
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const { startTime } = JSON.parse(stored);
      if (startTime) {
        enterRunningState(startTime);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  startBtn.addEventListener('click', () => {
    const startTime = Date.now();
    const startTzOffset = new Date().getTimezoneOffset();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTime, startTzOffset }));
    enterRunningState(startTime);
  });

  stopBtn.addEventListener('click', async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    let startTime, startTzOffset;
    try {
      ({ startTime, startTzOffset } = JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      enterIdleState();
      return;
    }

    const endTime = Date.now();
    const endTzOffset = new Date().getTimezoneOffset();
    const durationMs = endTime - startTime;

    localStorage.removeItem(STORAGE_KEY);
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
      const ok = await postInterval(payload);
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
