import { getTodayTotalMs } from './todayState.js';

const BACKEND_ORIGIN = 'http://localhost:7000';

// cache value shape: { rows, todayServerMsAtFetch }
const cache = new Map();

// Drill stack: array of { from, to, label }. Bottom frame = preset/custom root.
// Currently rendered level is always drillStack[drillStack.length - 1].
let drillStack = [];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(dateStr, days) {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime();
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mondayOf(dateStr) {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  const day = d.getUTCDay();
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const m = new Date(d.getTime() + daysToMonday * 24 * 60 * 60 * 1000);
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}-${String(m.getUTCDate()).padStart(2, '0')}`;
}

function daysBetween(from, to) {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function pickGranularity(from, to) {
  const span = daysBetween(from, to);
  if (span <= 31) return 'day';
  if (span <= 90) return 'week';
  if (span <= 730) return 'month';
  return 'year';
}

function computeRange(preset) {
  const today = todayStr();
  if (preset === '7d') return { from: offsetDate(today, -6), to: today, label: 'Last 7 Days' };
  if (preset === '30d') return { from: offsetDate(today, -29), to: today, label: 'Last 30 Days' };
  if (preset === 'month') return { from: today.slice(0, 7) + '-01', to: today, label: 'This Month' };
  return null;
}

function drillTargetFor(bucketKey, fromGranularity) {
  const today = todayStr();
  if (fromGranularity === 'year') {
    const yearEnd = `${bucketKey}-12-31`;
    return { from: `${bucketKey}-01-01`, to: yearEnd < today ? yearEnd : today };
  }
  if (fromGranularity === 'month') {
    const [y, m] = bucketKey.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthEnd = `${bucketKey}-${String(lastDay).padStart(2, '0')}`;
    return { from: `${bucketKey}-01`, to: monthEnd < today ? monthEnd : today };
  }
  if (fromGranularity === 'week') {
    const weekEnd = offsetDate(bucketKey, 6);
    return { from: bucketKey, to: weekEnd < today ? weekEnd : today };
  }
  return null;
}

function formatBucketLabel(bucketKey, granularity, rangeCrossesYears, from, to) {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);

  if (granularity === 'day') {
    if (bucketKey === today) return 'Today';
    if (bucketKey === yesterday) return 'Yesterday';
    const [yyyy, mm, dd] = bucketKey.split('-').map(Number);
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    const opts = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' };
    if (rangeCrossesYears) opts.year = 'numeric';
    return d.toLocaleDateString('en-US', opts);
  }

  if (granularity === 'week') {
    const weekStart = bucketKey > from ? bucketKey : from;
    const weekEnd = offsetDate(bucketKey, 6);
    const fmtOpts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    if (rangeCrossesYears) fmtOpts.year = 'numeric';
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const startLabel = new Date(Date.UTC(sy, sm - 1, sd)).toLocaleDateString('en-US', fmtOpts);
    const endLabel = new Date(Date.UTC(ey, em - 1, ed)).toLocaleDateString('en-US', fmtOpts);
    return `${startLabel} – ${endLabel}`;
  }

  if (granularity === 'month') {
    const [yyyy, mm] = bucketKey.split('-').map(Number);
    return new Date(Date.UTC(yyyy, mm - 1, 1)).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric', timeZone: 'UTC'
    });
  }

  // year
  return bucketKey;
}

function todayBucketKey(granularity) {
  const today = todayStr();
  if (granularity === 'day') return today;
  if (granularity === 'week') return mondayOf(today);
  if (granularity === 'month') return today.slice(0, 7);
  return today.slice(0, 4);
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

function renderBreadcrumb() {
  const el = document.getElementById('drill-breadcrumb');
  if (drillStack.length <= 1) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  el.hidden = false;
  el.innerHTML = '';

  drillStack.forEach((frame, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '›';
      el.appendChild(sep);
    }

    const crumb = document.createElement('span');
    const isCurrent = i === drillStack.length - 1;
    crumb.className = isCurrent ? 'crumb current' : 'crumb';
    crumb.textContent = frame.label;

    if (!isCurrent) {
      crumb.addEventListener('click', () => {
        drillStack = drillStack.slice(0, i + 1);
        loadDailyTotals(frame.from, frame.to, frame.label, false);
      });
    }

    el.appendChild(crumb);
  });
}

function render(rows, label, granularity, from, to, todayServerMsAtFetch) {
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');
  const headingEl = document.getElementById('history-heading');

  headingEl.textContent = label;
  listEl.innerHTML = '';

  renderBreadcrumb();

  const rangeCrossesYears = from.slice(0, 4) !== to.slice(0, 4);
  const todayKey = todayBucketKey(granularity);
  const delta = getTodayTotalMs() - todayServerMsAtFetch;

  const effectiveMsList = rows.map(row => {
    const base = row.bucket_key === todayKey ? row.total_ms + delta : row.total_ms;
    return Math.max(0, base);
  });
  const maxMs = Math.max(1, ...effectiveMsList);

  const isDrillable = granularity !== 'day';

  let grandTotalMs = 0;
  rows.forEach((row, i) => {
    const ms = effectiveMsList[i];
    grandTotalMs += ms;

    const li = document.createElement('li');
    let className = ms > 0 ? 'day-row active' : 'day-row empty';
    if (isDrillable) className += ' drillable';
    li.className = className;

    if (ms > 0) {
      const bar = document.createElement('div');
      bar.className = 'day-bar';
      bar.style.width = (ms / maxMs * 100) + '%';
      li.appendChild(bar);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'day-label';
    labelSpan.textContent = formatBucketLabel(row.bucket_key, granularity, rangeCrossesYears, from, to);

    const totalSpan = document.createElement('span');
    totalSpan.className = 'day-total';
    totalSpan.textContent = formatTotalMs(ms);

    li.appendChild(labelSpan);
    li.appendChild(totalSpan);

    if (isDrillable) {
      li.addEventListener('click', () => {
        const target = drillTargetFor(row.bucket_key, granularity);
        if (!target) return;
        const drillLabel = formatBucketLabel(row.bucket_key, granularity, rangeCrossesYears, from, to);
        drillStack.push({ from: target.from, to: target.to, label: drillLabel });
        loadDailyTotals(target.from, target.to, drillLabel, false);
      });
    }

    listEl.appendChild(li);
  });

  aggregationTotalEl.textContent = formatTotalMs(grandTotalMs);
  aggregationTotalEl.hidden = false;
}

// pushToStack=true resets/sets the root frame; false means a drill push already happened
async function loadDailyTotals(from, to, label, pushToStack = true) {
  if (pushToStack) {
    drillStack = [{ from, to, label }];
  }

  const granularity = pickGranularity(from, to);
  const cacheKey = `${from}|${to}|${granularity}`;
  const listEl = document.getElementById('daily-totals-list');
  const aggregationTotalEl = document.getElementById('aggregation-total');

  if (cache.has(cacheKey)) {
    const { rows, todayServerMsAtFetch } = cache.get(cacheKey);
    render(rows, label, granularity, from, to, todayServerMsAtFetch);
    return;
  }

  listEl.innerHTML = '<li class="loading">Loading…</li>';
  aggregationTotalEl.hidden = true;

  try {
    const response = await fetch(
      `${BACKEND_ORIGIN}/intervals/daily-totals?from=${from}&to=${to}&granularity=${granularity}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      listEl.innerHTML = '<li class="error">Could not load history.</li>';
      return;
    }
    const rows = (await response.json()).reverse();
    const todayServerMsAtFetch = getTodayTotalMs();
    cache.set(cacheKey, { rows, todayServerMsAtFetch });
    render(rows, label, granularity, from, to, todayServerMsAtFetch);
  } catch {
    listEl.innerHTML = '<li class="error">Could not load history.</li>';
  }
}

export function rerenderActiveRange() {
  if (drillStack.length === 0) return;
  const top = drillStack[drillStack.length - 1];
  loadDailyTotals(top.from, top.to, top.label, false);
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
      customFromEl.value = '';
      customToEl.value = '';
      applyBtn.disabled = true;
      const range = computeRange(preset);
      // pushToStack=true resets drill stack to this root range
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

  const defaultRange = computeRange('7d');
  loadDailyTotals(defaultRange.from, defaultRange.to, defaultRange.label);
}
