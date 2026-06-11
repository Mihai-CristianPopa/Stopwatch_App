import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { totalsByDay } from "../services/intervalService.js";

function addDays(dateStr, days) {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime();
  const next = new Date(ms + days * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export const listDailyTotalsController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "listDailyTotalsController failed.";

  const today = todayUTC();
  const defaultFrom = addDays(today, -6);
  const defaultTo = today;

  const from = req.query.from || defaultFrom;
  const to = req.query.to || defaultTo;

  try {
    const userId = new ObjectId(req.user.id);
    const dbTotals = await totalsByDay(userId, { from, to });

    // Build a map from date → total_ms
    const totalsMap = {};
    for (const row of dbTotals) {
      totalsMap[row.date] = row.total_ms;
    }

    // Fill every day in [from, to] so the frontend always receives a full 7-row array
    const result = [];
    let current = from;
    while (current <= to) {
      result.push({
        date: current,
        total_ms: totalsMap[current] || 0
      });
      current = addDays(current, 1);
    }

    infoLog(req, startTime, `Daily totals fetched for user ${req.user.email} (${from} → ${to})`);
    return res.status(200).json(result);

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
