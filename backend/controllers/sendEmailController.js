import logger from "../logger.js";
import {errorObj, infoLog} from "../loggerHelper.js";
import { sendMail } from "../services/mailService.js";

export const sendEmailController = async (req, res) => {
    try {
        const info = await sendMail(res.locals.newUser);
        if (info.rejected.length > 0) {
            return res.status(500).json({
                statusCode: 500,
                message: "Something went wrong for: " + info.rejected
            });
        }
        return res.status(200).json({
            statusCode: 200,
            message: "Email successfully sent."
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: "Something went wrong"
        });
    }
}