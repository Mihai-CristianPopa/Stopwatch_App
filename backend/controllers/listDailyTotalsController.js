import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { totalsByBucket } from "../services/intervalService.js";
import { mondayOf, addMonths, addYears } from "../utils/timeBucket.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_GRANULARITIES = ['day', 'week', 'month', 'year'];

function addDays(dateStr, days) {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime();
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function fillBuckets(from, to, granularity, totalsMap) {
  const result = [];

  if (granularity === 'day') {
    let current = from;
    while (current <= to) {
      result.push({ bucket_key: current, total_ms: totalsMap[current] || 0 });
      current = addDays(current, 1);
    }
  } else if (granularity === 'week') {
    let current = mondayOf(from);
    const toMonday = mondayOf(to);
    while (current <= toMonday) {
      result.push({ bucket_key: current, total_ms: totalsMap[current] || 0 });
      current = addDays(current, 7);
    }
  } else if (granularity === 'month') {
    const fromMonth = from.slice(0, 7);
    const toMonth = to.slice(0, 7);
    let current = fromMonth + '-01';
    while (current.slice(0, 7) <= toMonth) {
      const key = current.slice(0, 7);
      result.push({ bucket_key: key, total_ms: totalsMap[key] || 0 });
      current = addMonths(current, 1);
    }
  } else {
    // year
    const fromYear = from.slice(0, 4);
    const toYear = to.slice(0, 4);
    let current = fromYear;
    while (current <= toYear) {
      result.push({ bucket_key: current, total_ms: totalsMap[current] || 0 });
      current = addYears(current, 1);
    }
  }

  return result;
}

export const listDailyTotalsController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "listDailyTotalsController failed.";

  const today = todayUTC();
  const from = req.query.from || addDays(today, -6);
  const to = req.query.to || today;
  const granularity = VALID_GRANULARITIES.includes(req.query.granularity)
    ? req.query.granularity
    : 'day';

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return res.status(400).json(ERROR_OBJECTS.BAD_REQUEST('from/to must be YYYY-MM-DD'));
  }
  if (from > to) {
    return res.status(400).json(ERROR_OBJECTS.BAD_REQUEST('from must not be after to'));
  }

  try {
    const userId = new ObjectId(req.user.id);
    const dbBuckets = await totalsByBucket(userId, { from, to, granularity });

    const totalsMap = {};
    for (const row of dbBuckets) {
      totalsMap[row.bucket_key] = row.total_ms;
    }

    const result = fillBuckets(from, to, granularity, totalsMap);

    infoLog(req, startTime, `Totals fetched for user ${req.user.email} (${from} → ${to}, ${granularity})`);
    return res.status(200).json(result);

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
