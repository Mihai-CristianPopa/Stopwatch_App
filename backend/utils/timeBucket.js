/**
 * Converts a UTC ISO string to a YYYY-MM-DD local date string using the given TZ offset.
 * tzOffsetMin: value from Date.getTimezoneOffset() — negative east of UTC (e.g. UTC+2 → -120).
 */
export function localDay(isoUtc, tzOffsetMin) {
  const utcMs = new Date(isoUtc).getTime();
  // Subtract the offset to shift from UTC to local time.
  // getTimezoneOffset() returns minutes-west, so UTC+2 = -120 → subtract -120 min = add 120 min.
  const localMs = utcMs - tzOffsetMin * 60 * 1000;
  const localDate = new Date(localMs);
  const yyyy = localDate.getUTCFullYear();
  const mm = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the UTC timestamp (ms) of local midnight for a given local YYYY-MM-DD date.
 * tzOffsetMin: value from Date.getTimezoneOffset() — negative east of UTC.
 */
function localMidnightUTC(dateStr, tzOffsetMin) {
  // Parse the date as UTC midnight, then shift back by tzOffset to get UTC time of local midnight.
  const utcMidnight = Date.UTC(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)) - 1,
    parseInt(dateStr.slice(8, 10))
  );
  return utcMidnight + tzOffsetMin * 60 * 1000;
}

/**
 * Add one calendar day to a YYYY-MM-DD string.
 */
function nextDay(dateStr) {
  const ms = localMidnightUTC(dateStr, 0); // UTC midnight of the date
  const next = new Date(ms + 24 * 60 * 60 * 1000);
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Splits a UTC interval across local-midnight boundaries using the given TZ offset.
 * Returns an array of {start_time, end_time, date, duration_ms} objects.
 * If the interval falls within a single local day, returns a single element.
 * Bounded at max 2 elements in practice (24h validation upstream).
 *
 * @param {string} startUtc - ISO 8601 UTC string
 * @param {string} endUtc   - ISO 8601 UTC string
 * @param {number} tzOffsetMin - Date.getTimezoneOffset() value at start
 * @returns {{start_time: string, end_time: string, date: string, duration_ms: number}[]}
 */
export function splitAcrossLocalMidnight(startUtc, endUtc, tzOffsetMin) {
  const startMs = new Date(startUtc).getTime();
  const endMs = new Date(endUtc).getTime();

  const startDay = localDay(startUtc, tzOffsetMin);
  const endDay = localDay(endUtc, tzOffsetMin);

  if (startDay === endDay) {
    return [{
      start_time: startUtc,
      end_time: endUtc,
      date: startDay,
      duration_ms: endMs - startMs
    }];
  }

  const segments = [];
  let currentDay = startDay;
  let segmentStartMs = startMs;

  while (currentDay !== endDay) {
    const nextDayStr = nextDay(currentDay);
    const localMidnightMs = localMidnightUTC(nextDayStr, tzOffsetMin);
    const segmentEndMs = Math.min(localMidnightMs, endMs);

    segments.push({
      start_time: new Date(segmentStartMs).toISOString(),
      end_time: new Date(segmentEndMs).toISOString(),
      date: currentDay,
      duration_ms: segmentEndMs - segmentStartMs
    });

    currentDay = nextDayStr;
    segmentStartMs = localMidnightMs;
  }

  // Final segment: from last local midnight to end
  segments.push({
    start_time: new Date(segmentStartMs).toISOString(),
    end_time: endUtc,
    date: endDay,
    duration_ms: endMs - segmentStartMs
  });

  return segments;
}
