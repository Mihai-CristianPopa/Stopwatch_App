import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { updateSessionStopwatchStartTime } from "../services/sessionService.js";
import { getSessionId } from "../utils/sessionCookieHandling.js";
import { ERROR_OBJECTS } from "../utils/constants.js";

export const stopwatchStateController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "stopwatchStateController failed.";

  try {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      return res.status(401).json(ERROR_OBJECTS.NO_COOKIE_FOUND());
    }

    const result = await updateSessionStopwatchStartTime(sessionId, req.body?.start_time ?? null);

    if (result.matchedCount === 0) {
      warnLog(req, startTime, `Session ${sessionId} not found when updating stopwatch state`);
      return res.status(404).json(ERROR_OBJECTS.SESSION_NOT_FOUND());
    }

    const action = req.body?.start_time ? `set to ${req.body.start_time}` : "cleared";
    infoLog(req, startTime, `Stopwatch start time ${action} for session ${sessionId}`);
    return res.status(200).json({ message: "Stopwatch state updated." });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
