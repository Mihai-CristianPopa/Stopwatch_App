import bcrypt from "bcrypt";
import logger from "../logger.js";
import { errorObj, warnLog, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS, INFO_MESSAGE, loginErrorMessageWrongCredentialsFrontendFacing, DB_KEYS } from "../utils/constants.js";
import { getUserByEmail } from "../services/userService.js";
import { createLoginSession, getUserLoginSession, updateLoginSession, createDeviceSession } from "../services/sessionService.js";
import { setSessionCookie, createLoginSessionClearingIndex, sessionExpirationTimeInMiliseconds } from "../utils/sessionCookieHandling.js";
import { getClearingIndexExpireAfterSeconds } from "../services/commonService.js"

export const loginController = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  const METHOD_FAILURE_MESSAGE = "loginController failed.";

  function handleLoginError(err, frontendMessage=null) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    if (frontendMessage) err.message = frontendMessage;
    return res.status(err.statusCode).json(err);
  }

  /** Needs to be executed only once, or in case something the storing time of the cookies changes. */
  async function setClearingIndexForSessionCookies() {
    const sessionClearingIndex = await createLoginSessionClearingIndex();
    if (!sessionClearingIndex) {
      warnLog(req, startTime, "TTL for creating the login sessions failed to be created");
    }
  }

  if (!email) {
    return handleLoginError(ERROR_OBJECTS.BAD_REQUEST("email"));
  }

  if (!password) {
    return handleLoginError(ERROR_OBJECTS.BAD_REQUEST("password"));
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      return handleLoginError(ERROR_OBJECTS.NO_USER_FOUND_WITH_EMAIL(email), loginErrorMessageWrongCredentialsFrontendFacing);
    }

    const isSamePassword = bcrypt.compareSync(password, existingUser.password);
    if (!isSamePassword) {
      return handleLoginError(ERROR_OBJECTS.WRONG_PASSWORD(email), loginErrorMessageWrongCredentialsFrontendFacing);
    }

    // Only reset the clearing index if the time to maintain the cookies in the db is different than the current TTL of the index
    const curentClearingIndexExpirationTimeInSeconds = await getClearingIndexExpireAfterSeconds(DB_KEYS.AUTH_DB, DB_KEYS.SESSIONS_COLLECTION, DB_KEYS.TTL_FIELD);
    if (curentClearingIndexExpirationTimeInSeconds !== sessionExpirationTimeInMiliseconds / 1000) await setClearingIndexForSessionCookies();

    const login_time = new Date().toISOString();

    // Resolve or create parent session
    let parentSession = await getUserLoginSession(existingUser._id);
    if (!parentSession) {
      try {
        const sessionData = await createLoginSession({
          user_id: existingUser._id,
          email_address: existingUser.email_address,
          login_time,
          last_login_time: login_time
        });
        parentSession = { _id: sessionData.insertedId };
        infoLog(req, startTime, INFO_MESSAGE.LOGIN_SESSION_CREATED(sessionData.insertedId.toString(), email));
      } catch (err) {
        if (err.code === 11000) {
          // Race condition: another login created the parent session just now
          parentSession = await getUserLoginSession(existingUser._id);
        } else {
          throw err;
        }
      }
    } else {
      const properlyUpdatedSession = await updateLoginSession(parentSession._id, login_time);
      if (!properlyUpdatedSession) {
        warnLog(req, startTime, `Session with id ${parentSession._id.toString()} did not get its last login time updated for ${email}`);
      }
      infoLog(req, startTime, `Session with id ${parentSession._id.toString()} was reused for ${email}`);
    }

    // Always create a new device session for this browser
    const deviceSessionData = await createDeviceSession({
      session_id: parentSession._id,
      last_login_time: login_time
    });

    infoLog(req, startTime, `Device session ${deviceSessionData.insertedId.toString()} created for ${email}`);
    setSessionCookie(res, deviceSessionData.insertedId.toString());

    infoLog(req, startTime, INFO_MESSAGE.USER_LOGGED_IN(email));
    return res.status(200).json({
      message: INFO_MESSAGE.USER_LOGGED_IN(email),
      user: {
        id: existingUser._id,
        email: existingUser.email_address
      },
      stopwatch_start_time: parentSession.stopwatch_start_time ?? null
    });

  } catch(error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
