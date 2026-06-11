const BACKEND_ORIGIN = 'http://127.0.0.1:7000';
const STORAGE_KEY = 'stopwatch:active';
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

export function initStopwatch() {
  const startBtn = getStartBtn();
  const stopBtn = getStopBtn();

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

    try {
      const response = await fetch(`${BACKEND_ORIGIN}/intervals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          start_tz_offset_min: startTzOffset,
          end_tz_offset_min: endTzOffset
        })
      });

      if (response.ok) {
        showToast(`Saved ${formatDurationHuman(durationMs)}`);
      } else {
        showToast('Could not save session. Please try again.');
      }
    } catch {
      showToast('Could not save session. Please try again.');
    }
  });
}
