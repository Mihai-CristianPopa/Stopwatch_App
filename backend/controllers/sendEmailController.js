import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendEmail } from "../services/mailService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { emailConfirmationHtml } from "../utils/emailConfirmationHtmlWrapper.js";
import { passwordResetHtml } from "../utils/passwordResetHtmlWrapper.js";
import { config } from "../configs/config.js";

const PROD_BACKEND_BASE_URL = "https://stopwatch-tracker.onrender.com";
const LOCAL_BACKEND_BASE_URL = "http://localhost:7000";

const baseUrl = (config.isProduction ? PROD_BACKEND_BASE_URL : LOCAL_BACKEND_BASE_URL);
const SENDER_ADDRESS = `Stopwatch Tracker <no-reply@${config.emailSendingDomain}>`;

export const sendEmailConfirmationController = async (req, res) => {
    const METHOD_FAILURE_MESSAGE = "sendEmailConfirmationController failed.";
    const startTime = Date.now();
    try {
        const confirmationUrl = `${baseUrl}/authentication/email-confirmation?userId=${res.locals.newUser.userId}&token=${res.locals.newUser.token}`;  
        infoLog(req, startTime, "Redirect url: " + confirmationUrl + " just requested the email sending");
        // const info = await sendEmail({
        sendEmail({
            from: SENDER_ADDRESS,
            to: res.locals.newUser.email, // list of recipients
            subject: "Confirm your Stopwatch Tracker account", // subject line
            html: emailConfirmationHtml(confirmationUrl), // HTML body
        }, startTime);
        // if (info.rejected.length > 0) {
        //     logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, {
        //         statusCode: 500,
        //         message: "Something went wrong for: " + info.rejected
        //     }));
        //     return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
        // }
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
    try {
        const redirectUrl = (config.isProduction ? PROD_FRONTEND_BASE_URL : LOCAL_FRONTEND_BASE_URL) + `?reset-password-email=${res.locals.passwordResetEntry.email}&token=${res.locals.passwordResetEntry.token}`;
        infoLog(req, startTime, "Redirect url: " + redirectUrl + " just requested the email sending");

        sendEmail({
            to: res.locals.passwordResetEntry.email, // list of recipients
            template: {
                id: "stopwatch-tracker-password-reset",
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