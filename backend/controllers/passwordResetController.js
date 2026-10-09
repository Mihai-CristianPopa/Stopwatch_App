import bcrypt from "bcrypt";
import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { updateUserPassword, getUserByEmail } from "../services/userService.js";
import { invalidatePasswordResetEntryByEmail, getPasswordResetEntryByToken, getPasswordResetEntryById, createPasswordResetEntry, successfulPasswordResetEntry, invalidatePasswordResetEntry, getNotExpiredPasswordResetEntryByEmail } from "../services/passwordResetService.js";
import * as crypto from 'node:crypto';
import { createTokenObject } from "../services/tokenCreationService.js";

// Create a token, store it in a db table, create a url and send an email
export const createPasswordResetEmailController = async (req, res, next) => {
  const METHOD_FAILURE_MESSAGE = "createPasswordResetEmailController failed.";
  const startTime = Date.now();
  const { email } = req.body;
  let err;

  if (!email) {
    err = ERROR_OBJECTS.BAD_REQUEST("email");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  try {
    const user = await getUserByEmail(email);
    // If user does not exist we want to treat this the same as we treat the success scenario
    if(!user){
      // Update error message to show that the user does not exist
      // at this point the user should exist but not be verified
      err = ERROR_OBJECTS.USER_DOES_NOT_EXIST(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(200).json({
        message: INFO_MESSAGE.PASSWORD_RESET_CONFIRMATION(email)
      });
    }
    // If the user is not even verified do not allow password reset
    if (user?.isVerified === false) {
      err = ERROR_OBJECTS.USER_NOT_VERIFIED(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(200).json({
        message: INFO_MESSAGE.PASSWORD_RESET_CONFIRMATION(email)
      });
    }

    // Check if there exists already a PasswordResetEntry for the user that is active, so filter by user and exp not in the past
    // if it exists tell the user that a password recovery processed has already been started for the user
    const alreadyExistingAvailablePasswordReset = await getNotExpiredPasswordResetEntryByEmail(email);
    if (alreadyExistingAvailablePasswordReset) {
      err = ERROR_OBJECTS.PASSWORD_RESET_ALREADY_EXISTS(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(200).json({
        message: INFO_MESSAGE.PASSWORD_RESET_CONFIRMATION(email)
      });
    }

    const passwordResetTokenTimeBeforeExpiry = 60 * 60 * 1000; // 1 hour
    const o = await createTokenObject(passwordResetTokenTimeBeforeExpiry);

    const newlyCreatedPasswordResetEntry = await createPasswordResetEntry(
      {
        userId: user._id.toString(),
        email: email,
        tokenHash: o.tokenHash,
        iss: o.iss,
        exp: o.exp,
        succeeded: false,
        valid: true
      }
    );

    // if the entry was not created correctly do something
    if (!newlyCreatedPasswordResetEntry || !newlyCreatedPasswordResetEntry.insertedId) {
      err = ERROR_OBJECTS.PASSWORD_RESET_CREATION_FAILED(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }
    // otherwise log the entry creation (skipped)
    // and pass the data to the email sending process
    res.locals.passwordResetEntry = { email: email, token: o.token };
    infoLog(req, startTime, "Passing the request over to the sendEmailController");
    next()
  } catch (error) {
    logger.error(`${METHOD_FAILURE_MESSAGE} for ${email}`, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
}

// Confirm that the token is proper and update the password
export const passwordResetConfirmationController = async (req, res) => {
  const METHOD_FAILURE_MESSAGE = "passwordResetConfirmationController failed.";
  const startTime = Date.now();
  const { token, email, password } = req.body;

  let err;

  if (!token) {
    err = ERROR_OBJECTS.BAD_REQUEST("token");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  if (!email) {
    err = ERROR_OBJECTS.BAD_REQUEST("email");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  if (!password) {
    err = ERROR_OBJECTS.BAD_REQUEST("password");
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err); 
  }

  try {
    const runtimeTokenHash = await crypto.createHash('sha256').update(token).digest('hex');
    const passwordResetEntry = await getPasswordResetEntryByToken(runtimeTokenHash);
    if (!passwordResetEntry) {
      err = ERROR_OBJECTS.NO_PASSWORD_RESET_FOR_USER(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    if(passwordResetEntry.email !== email){
      // Update error message to show that the user does not exist
      // at this point the user should exist but not be verified
      err = ERROR_OBJECTS.USER_DOES_NOT_MATCH(passwordResetEntry.email, email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err); 
    }

    if(!passwordResetEntry.valid){
      // Update error message to show that the user does not exist
      // at this point the user should exist but not be verified
      err = ERROR_OBJECTS.INVALID_TOKEN();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err); 
    }

    if (passwordResetEntry.iss > new Date()) {
      // token is in the future
      err = ERROR_OBJECTS.TOKEN_IN_THE_FUTURE();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidatePasswordResetEntry(passwordResetEntry._id.toString());
      return res.status(err.statusCode).json(err);
    }


    if (passwordResetEntry.exp < new Date()) {
      // token is expired
      err = ERROR_OBJECTS.EXPIRED_TOKEN();
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      invalidatePasswordResetEntry(passwordResetEntry._id.toString());
      return res.status(err.statusCode).json(err);
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const updatedUser = await updateUserPassword(passwordResetEntry.userId, hashedPassword)
    if (!updatedUser || !updatedUser.acknowledged) {
      err = ERROR_OBJECTS.PASSWORD_RESET_FAILED(email);
      invalidatePasswordResetEntry(passwordResetEntry._id.toString());
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    }

    successfulPasswordResetEntry(passwordResetEntry._id.toString());
    return res.status(200).json({
      message: "Password reset successfully"
    });
  } catch(error) {
    logger.error(`${METHOD_FAILURE_MESSAGE} for ${email}`, errorObj(req, startTime, error));
    invalidatePasswordResetEntryByEmail(email);
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }


}