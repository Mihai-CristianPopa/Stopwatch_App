import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendMail } from "../services/mailService.js";
import { ERROR_OBJECTS, INFO_MESSAGE } from "../utils/constants.js";

const METHOD_FAILURE_MESSAGE = "emailConfirmationController failed.";

export const emailConfirmationController = async (req, res) => {
    const startTime = Date.now();
    const { userId, token } = req.query;
}