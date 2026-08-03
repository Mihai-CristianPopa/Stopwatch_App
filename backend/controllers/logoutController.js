import logger from "../logger.js";
import { warnLog, infoLog, errorObj } from "../loggerHelper.js";
import { deleteDeviceSession } from "../services/sessionService.js";
import { getSessionId, clearSessionCookie } from "../utils/sessionCookieHandling.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";

export const logoutController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "logoutController failed.";

  async function deleteDeviceSessionFromDb(deviceSessionId) {
    const result = await deleteDeviceSession(deviceSessionId);
    if (result.deletedCount !== 0) {
      infoLog(req, startTime, `Device session ${deviceSessionId} deleted successfully`);
    } else {
      warnLog(req, startTime, `Deletion of device session ${deviceSessionId} failed`);
    }
  }

  try {
    const deviceSessionId = getSessionId(req);

    if (!deviceSessionId) {
      return res.status(401).json(ERROR_OBJECTS.NO_COOKIE_LOGOUT());
    }

    deleteDeviceSessionFromDb(deviceSessionId);

    clearSessionCookie(res);

    infoLog(req, startTime, INFO_MESSAGE.USER_LOGGED_OUT);

    return res.status(200).json({ message: INFO_MESSAGE.USER_LOGGED_OUT });

  } catch(error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
  }

  clearSessionCookie(res);

  return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
};
