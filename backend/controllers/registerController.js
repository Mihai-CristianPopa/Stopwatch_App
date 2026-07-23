import bcrypt from "bcrypt";
import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { registerUser, getUserByEmail } from "../services/userService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import * as crypto from 'node:crypto';

const METHOD_FAILURE_MESSAGE = "registerController failed.";

export const registerController = async (req, res, next) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  let err;

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
    if (await getUserByEmail(email)){
      err = ERROR_OBJECTS.USER_ALREADY_EXISTS(email);
      logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
      return res.status(err.statusCode).json(err);
    };

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const confirmationToken = await crypto.randomBytes(32).toString('hex');
    // Faster than bcrypt, not worth 
    const confirmationTokenHash = await crypto.createHash('sha256').update(token).digest('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await registerUser({
      email_address: email,
      password: hashedPassword,
      created_at: new Date(),
      isVerified: false,
      emailVerificationToken: confirmationTokenHash,
      emailVerificationExpiresAt,
      date: new Date().toISOString().split('T')[0]
    });

    infoLog(req, startTime, INFO_MESSAGE.USER_REGISTERED(email));
    res.locals.newUser = { userId: newUser.insertedId.toString(), email: email, token: confirmationToken };
    return next();
    // res.status(201).json({
    //   message: INFO_MESSAGE.USER_REGISTERED(email)
    // });
  } catch(error) {
    logger.error(`${METHOD_FAILURE_MESSAGE} for ${email}`, errorObj(req, startTime, error));
    res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }

};
