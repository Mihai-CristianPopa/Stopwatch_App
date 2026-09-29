import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendEmail } from "../services/mailService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";
import { emailConfirmationHtml } from "../utils/emailConfirmationHtmlWrapper.js";
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

        const info = await sendEmail({
            from: SENDER_ADDRESS,
            to: res.locals.newUser.email, // list of recipients
            subject: "Confirm your Stopwatch Tracker account", // subject line
            html: emailConfirmationHtml(confirmationUrl), // HTML body
        });
        if (info.rejected.length > 0) {
            logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, {
                statusCode: 500,
                message: "Something went wrong for: " + info.rejected
            }));
            return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
        }
        infoLog(req, startTime, INFO_MESSAGE.USER_REGISTERED(res.locals.newUser.email));
        res.status(201).json({
            message: INFO_MESSAGE.USER_REGISTERED(res.locals.newUser.email)
        });
    } catch (error) {
        logger.error(`${METHOD_FAILURE_MESSAGE} for ${email}`, errorObj(req, startTime, error));
        res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
    }
}