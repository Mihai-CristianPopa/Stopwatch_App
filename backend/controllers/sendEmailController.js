import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendEmail } from "../services/mailService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { config } from "../configs/config.js";

const PROD_BACKEND_BASE_URL = "https://stopwatch-tracker.onrender.com";
const LOCAL_BACKEND_BASE_URL = "http://localhost:7000";

const baseUrl = (config.isProduction ? PROD_BACKEND_BASE_URL : LOCAL_BACKEND_BASE_URL);
const templates = config.templateId;

export const sendEmailConfirmationController = async (req, res) => {
    const METHOD_FAILURE_MESSAGE = "sendEmailConfirmationController failed.";
    const startTime = Date.now();

    if (!templates.emailConfirmation) {
        const err = ERROR_OBJECTS.MISSING_CONFIG("email confirmation template");
        logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
        return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }

    try {
        const confirmationUrl = `${baseUrl}/authentication/email-confirmation?userId=${res.locals.newUser.userId}&token=${res.locals.newUser.token}`;  
        infoLog(req, startTime, "Redirect url: " + confirmationUrl + " just requested the email sending");
        sendEmail({
            to: res.locals.newUser.email, // list of recipients
            template: {
                id: templates.emailConfirmation,
                variables: {
                    URL: confirmationUrl,
                },
            }
        }, startTime);
        infoLog(req, startTime, INFO_MESSAGE.USER_REGISTERED(res.locals.newUser.email));
        res.status(201).json({
            message: INFO_MESSAGE.USER_REGISTERED(res.locals.newUser.email)
        });
    } catch (error) {
        logger.error(`${METHOD_FAILURE_MESSAGE} for ${res.locals.newUser.email}`, errorObj(req, startTime, error));
        res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }
}

export const sendPasswordResetController = async (req, res) => {
    const METHOD_FAILURE_MESSAGE = "sendPasswordResetController failed.";
    const startTime = Date.now();
    const PROD_FRONTEND_BASE_URL = "mihai-cristianpopa.github.io/Frontend_Stopwatch_App/";
    const LOCAL_FRONTEND_BASE_URL = "http://localhost:5500/frontend/index.html";
    

    if (!templates.passwordReset) {
        const err = ERROR_OBJECTS.MISSING_CONFIG("password reset template");
        logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
        return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }
    
    try {
        const redirectUrl = (config.isProduction ? PROD_FRONTEND_BASE_URL : LOCAL_FRONTEND_BASE_URL) + `?reset-password-email=${res.locals.passwordResetEntry.email}&token=${res.locals.passwordResetEntry.token}`;
        infoLog(req, startTime, "Redirect url: " + redirectUrl + " just requested the email sending");
        sendEmail({
            to: res.locals.passwordResetEntry.email, // list of recipients
            template: {
                id: templates.passwordReset,
                variables: {
                    URL: redirectUrl,
                },
            }
        }, startTime);
        infoLog(req, startTime, INFO_MESSAGE.PASSWORD_RESET_CONFIRMATION(res.locals.passwordResetEntry.email));
        res.status(200).json({
            message: INFO_MESSAGE.PASSWORD_RESET_CONFIRMATION(res.locals.passwordResetEntry.email)
        });
    } catch (error) {
        logger.error(`${METHOD_FAILURE_MESSAGE} for ${res.locals.passwordResetEntry.email}`, errorObj(req, startTime, error));
        res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }
}