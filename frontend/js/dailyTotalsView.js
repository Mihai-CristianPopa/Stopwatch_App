import { getTodayTotalMs } from './todayState.js';

const BACKEND_ORIGIN = 'http://localhost:7000';

const cache = new Map();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function computeRange(preset) {
  const today = todayStr();
  if (preset === '7d') {
    const from = offsetDate(today, -6);
    return { from, to: today, label: 'Last 7 Days' };
  }
  if (preset === '30d') {
    const from = offsetDate(today, -29);
    return { from, to: today, label: 'Last 30 Days' };
  }
  if (preset === 'month') {
    const from = today.slice(0, 7) + '-01';
    return { from, to: today, label: 'This Month' };
  }
  return null;
}

function offsetDate(dateStr, days) {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime();
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDayLabel(dateStr) {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
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

function render(data, label, to) {
  const today = todayStr();
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');
  const headingEl = document.getElementById('history-heading');

  headingEl.textContent = label;
  listEl.innerHTML = '';

  let grandTotalMs = 0;
  for (const row of data) {
    const ms = (row.date === today && to === today) ? getTodayTotalMs() : row.total_ms;
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

async function loadDailyTotals(from, to, label) {
  const cacheKey = `${from}|${to}`;
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');

  if (cache.has(cacheKey)) {
    render(cache.get(cacheKey), label, to);
    return;
  }

  listEl.innerHTML = '<li class="loading">Loading…</li>';
  aggregationTotalEl.hidden = true;

  try {
    const response = await fetch(
      `${BACKEND_ORIGIN}/intervals/daily-totals?from=${from}&to=${to}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      listEl.innerHTML = '<li class="error">Could not load history.</li>';
      return;
    }
    const data = await response.json();
    cache.set(cacheKey, data.reverse());
    render(data, label, to);
  } catch {
    listEl.innerHTML = '<li class="error">Could not load history.</li>';
  }
}

export function initHistoryControls() {
  const today = todayStr();
  const presetBtns = document.querySelectorAll('.preset-btn');
  const customRangeEl = document.getElementById('custom-range');
  const customFromEl = document.getElementById('custom-from');
  const customToEl = document.getElementById('custom-to');
  const applyBtn = document.getElementById('apply-range-btn');

  customFromEl.max = today;
  customToEl.max = today;

  function setActivePreset(preset) {
    presetBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.preset === preset));
  }

  function checkApplyEnabled() {
    applyBtn.disabled = !(customFromEl.value && customToEl.value);
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      setActivePreset(preset);

      if (preset === 'custom') {
        customRangeEl.hidden = false;
        return;
      }

      customRangeEl.hidden = true;
      const range = computeRange(preset);
      loadDailyTotals(range.from, range.to, range.label);
    });
  });

  customFromEl.addEventListener('input', checkApplyEnabled);
  customToEl.addEventListener('input', checkApplyEnabled);

  applyBtn.addEventListener('click', () => {
    const from = customFromEl.value;
    const to = customToEl.value;
    if (!from || !to) return;
    loadDailyTotals(from, to, 'Custom');
  });

  // Load default (7d) on first call
  const defaultRange = computeRange('7d');
  loadDailyTotals(defaultRange.from, defaultRange.to, defaultRange.label);
}
