import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { splitAcrossLocalMidnight } from "../utils/timeBucket.js";
import { createIntervals } from "../services/intervalService.js";

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export const createIntervalController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "createIntervalController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { start_time, end_time, start_tz_offset_min, end_tz_offset_min } = req.body;

  if (start_time === undefined || start_time === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("start_time"));
  }
  if (end_time === undefined || end_time === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("end_time"));
  }
  if (start_tz_offset_min === undefined || start_tz_offset_min === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("start_tz_offset_min"));
  }
  if (end_tz_offset_min === undefined || end_tz_offset_min === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("end_tz_offset_min"));
  }

  const startMs = new Date(start_time).getTime();
  const endMs = new Date(end_time).getTime();

  if (isNaN(startMs)) {
    return handleError(ERROR_OBJECTS.INVALID_INTERVAL("start_time is not a valid date string."));
  }
  if (isNaN(endMs)) {
    return handleError(ERROR_OBJECTS.INVALID_INTERVAL("end_time is not a valid date string."));
  }
  if (endMs <= startMs) {
    return handleError(ERROR_OBJECTS.INVALID_INTERVAL("end_time must be after start_time."));
  }
  if (endMs - startMs > MAX_DURATION_MS) {
    return handleError(ERROR_OBJECTS.INTERVAL_TOO_LONG());
  }
  if (typeof start_tz_offset_min !== 'number' || start_tz_offset_min < -840 || start_tz_offset_min > 840) {
    return handleError(ERROR_OBJECTS.INVALID_INTERVAL("start_tz_offset_min must be a number between -840 and 840."));
  }
  if (typeof end_tz_offset_min !== 'number' || end_tz_offset_min < -840 || end_tz_offset_min > 840) {
    return handleError(ERROR_OBJECTS.INVALID_INTERVAL("end_tz_offset_min must be a number between -840 and 840."));
  }

  try {
    const segments = splitAcrossLocalMidnight(start_time, end_time, start_tz_offset_min);

    const userId = new ObjectId(req.user.id);
    const createdAt = new Date().toISOString();

    const rows = segments.map(seg => ({
      user_id: userId,
      start_time: seg.start_time,
      end_time: seg.end_time,
      start_tz_offset_min,
      end_tz_offset_min,
      duration_ms: seg.duration_ms,
      date: seg.date,
      label: null,
      category: null,
      created_at: createdAt
    }));

    await createIntervals(rows);

    infoLog(req, startTime, `Inserted ${rows.length} interval row(s) for user ${req.user.email}`);
    return res.status(201).json({ inserted: rows.length });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
