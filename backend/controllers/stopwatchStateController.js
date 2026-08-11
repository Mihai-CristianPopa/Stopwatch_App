import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { startSessionStopwatch, stopSessionStopwatch } from "../services/sessionService.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { broadcast } from '../sse.js'

export const stopwatchStateController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "stopwatchStateController failed.";

  try {

    if (req.body?.start_time) {
      const result = await startSessionStopwatch(req.parentSid, req.body.start_time);
      if (result.matchedCount === 0) {
        warnLog(req, startTime, `Session ${req.parentSid} not found when updating stopwatch state`);
        return res.status(404).json(ERROR_OBJECTS.SESSION_NOT_FOUND());
      }
      if (result.modifiedCount === 0) {
        warnLog(req, startTime, `Stopwatch already running for session ${req.parentSid}`);
        return res.status(409).json({ message: "Stopwatch already running." });
      }
    } else {
        await stopSessionStopwatch(req.parentSid);
    }

    broadcast(
      req.user.id.toString(),
      'stopwatch',
      req.body?.start_time
        ? { startTime: req.body.start_time }
        : { startTime: null, durationMs: req.body?.duration_ms ?? 0 }
    )

    const action = req.body?.start_time ? `set to ${req.body.start_time}` : "cleared";
    infoLog(req, startTime, `Stopwatch start time ${action} for session ${req.parentSid}`);
    return res.status(200).json({ message: "Stopwatch state updated." });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
