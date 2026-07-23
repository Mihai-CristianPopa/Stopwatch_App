import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendMail } from "../services/mailService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "sendEmailController failed.";

export const sendEmailController = async (req, res) => {
    const startTime = Date.now();
    try {
        const info = await sendMail(res.locals.newUser);
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