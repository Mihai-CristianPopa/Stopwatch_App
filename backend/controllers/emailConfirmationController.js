import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { activateUser, getUserById, invalidateConfirmationToken } from "../services/userService.js";
import { config } from "../configs/config.js";
import * as crypto from 'node:crypto';

const METHOD_FAILURE_MESSAGE = "emailConfirmationController failed.";

export const emailConfirmationController = async (req, res) => {
  const startTime = Date.now();
  const { userId, token } = req.query;

  let err;

  if (!userId) {
    err = ERROR_OBJECTS.BAD_REQUEST("userId");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  if (!token) {
    err = ERROR_OBJECTS.BAD_REQUEST("token");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  try {
    const user = await getUserById(userId);
    if(!user){
      // Update error message to show that the user does not exist
      // at this point the user should exist but not be verified
      err = ERROR_OBJECTS.USER_DOES_NOT_EXIST(userId);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err); 
    }
    if (user.isVerified) {
      // user was previously verified, not okay
      err = ERROR_OBJECTS.USER_ALREADY_VERIFIED(user.email_address);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidateConfirmationToken(userId);
      return res.status(err.statusCode).json(err); 
    }

    const confirmationTokenHash = await crypto.createHash('sha256').update(token).digest('hex');

    if (user.emailVerificationToken !== confirmationTokenHash) {
      // token is wrong
      err = ERROR_OBJECTS.INVALID_TOKEN();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidateConfirmationToken(userId);
      return res.status(err.statusCode).json(err);
    }

    if (user.emailVerificationIssuedAt > new Date()) {
      // token is expired
      err = ERROR_OBJECTS.TOKEN_IN_THE_FUTURE();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidateConfirmationToken(userId);
      return res.status(err.statusCode).json(err);
    }


    if (user.emailVerificationExpiresAt < new Date()) {
      // token is expired
      err = ERROR_OBJECTS.EXPIRED_TOKEN();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidateConfirmationToken(userId);
      return res.status(err.statusCode).json(err);
    }

    const activatedUser = await activateUser(userId)

    if (!activatedUser || !activatedUser.acknowledged){
      // user was not properly activated
      err = ERROR_OBJECTS.USER_ACTIVATION_FAILED(user.email_address);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err); 
    };

    infoLog(req, startTime, INFO_MESSAGE.USER_ACTIVATED(user.email_address));
    const PROD_FRONTEND_BASE_URL = "https://mihai-cristianpopa.github.io/Frontend_Stopwatch_App/";
    const LOCAL_FRONTEND_BASE_URL = "http://localhost:5500/frontend/index.html";
    const redirectUrl = (config.isProduction ? PROD_FRONTEND_BASE_URL : LOCAL_FRONTEND_BASE_URL) + `?email=${user.email_address}` ;
    return res.redirect(redirectUrl);

  } catch(error) {
    logger.error(`${METHOD_FAILURE_MESSAGE} for ${userId}`, errorObj(req, startTime, error));
    invalidateConfirmationToken(userId);
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }


}