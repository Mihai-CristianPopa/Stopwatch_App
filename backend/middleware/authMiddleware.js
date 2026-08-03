import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { getSessionId, clearSessionCookie, isSessionExpired } from "../utils/sessionCookieHandling.js";
import { getDeviceSession, deleteDeviceSession, getLoginSession } from "../services/sessionService.js";
import { ERROR_OBJECTS } from "../utils/constants.js";

export const requireAuthentication = async (req, res, next) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "requireAuthentication middleware failed.";

  async function invalidateDeviceSession(deviceSessionId) {
    try {
      await deleteDeviceSession(deviceSessionId);
      infoLog(req, startTime, `Device session ${deviceSessionId} invalidated`);
    } catch {
      warnLog(req, startTime, `Failed to delete device session ${deviceSessionId} during invalidation`);
    }
    clearSessionCookie(res);
  }

  function handleAuthError(err, statusCode) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(statusCode ?? err.statusCode).json(err);
  }

  try {
    const deviceSessionId = getSessionId(req);

    if (!deviceSessionId) {
      return handleAuthError(ERROR_OBJECTS.NO_COOKIE_FOUND());
    }

    if (!ObjectId.isValid(deviceSessionId)) {
      return handleAuthError(ERROR_OBJECTS.INVALID_SESSION_ID());
    }

    const deviceSession = await getDeviceSession(deviceSessionId);
    if (!deviceSession) {
      clearSessionCookie(res);
      return handleAuthError(ERROR_OBJECTS.SESSION_NOT_FOUND());
    }

    const parentSession = await getLoginSession(deviceSession.session_id.toString());
    if (!parentSession) {
      await invalidateDeviceSession(deviceSessionId);
      return handleAuthError(ERROR_OBJECTS.SESSION_NOT_FOUND());
    }

    if (!parentSession.last_login_time || isSessionExpired(parentSession.last_login_time)) {
      await invalidateDeviceSession(deviceSessionId);
      return handleAuthError(ERROR_OBJECTS.SESSION_EXPIRED());
    }

    req.sid = deviceSessionId;
    req.parentSid = parentSession._id.toString();

    req.user = {
      id: parentSession.user_id,
      email: parentSession.email_address
    };

    req.stopwatchStartTime = parentSession.stopwatch_start_time ?? null;

    infoLog(req, startTime, `Valid session for user: ${parentSession.email_address}.`);
    next();
  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
