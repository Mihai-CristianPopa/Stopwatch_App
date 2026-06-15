import { getTodayTotalMs } from './todayState.js';

const BACKEND_ORIGIN = 'http://localhost:7000';

let cachedData = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(dateStr) {
  const today = todayStr();
  const yesterdayMs = Date.now() - 24 * 60 * 60 * 1000;
  const yesterdayStr = new Date(yesterdayMs).toISOString().slice(0, 10);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function formatTotalMs(ms) {
  if (ms === 0) return '0h 0m';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function render(data) {
  const today = todayStr();
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');

  listEl.innerHTML = '';

  let grandTotalMs = 0;
  for (const row of data) {
    const ms = row.date === today ? getTodayTotalMs() : row.total_ms;
    grandTotalMs += ms;

    const li = document.createElement('li');
    li.className = ms > 0 ? 'day-row active' : 'day-row empty';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'day-label';
    labelSpan.textContent = formatDayLabel(row.date);

    const totalSpan = document.createElement('span');
    totalSpan.className = 'day-total';
    totalSpan.textContent = formatTotalMs(ms);

    li.appendChild(labelSpan);
    li.appendChild(totalSpan);
    listEl.appendChild(li);
  }

  aggregationTotalEl.textContent = formatTotalMs(grandTotalMs);
  aggregationTotalEl.hidden = false;
}

export async function loadDailyTotals() {
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');

  if (cachedData) {
    render(cachedData);
    return;
  }

  listEl.innerHTML = '<li class="loading">Loading…</li>';
  aggregationTotalEl.hidden = true;

  try {
    const response = await fetch(`${BACKEND_ORIGIN}/intervals/daily-totals`, {
      credentials: 'include'
    });

    if (!response.ok) {
      listEl.innerHTML = '<li class="error">Could not load history.</li>';
      return;
    }

    cachedData = await response.json();
    render(cachedData);
  } catch {
    listEl.innerHTML = '<li class="error">Could not load history.</li>';
  }
}
