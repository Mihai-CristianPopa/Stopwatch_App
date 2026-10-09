import { config } from "../configs/config.js";
import { infoLogMessage, errorLog } from "../loggerHelper.js";
import { Resend } from 'resend';

/** emailObject must contain from, to, subject and html. */
export const sendEmail = async (emailObject, startTime) => {    
    const resend = new Resend(config.smtpPass);
    const { data, error } = await resend.emails.send(emailObject);
    if (error) {
        errorLog(startTime, error);
        return 
    }
    infoLogMessage(startTime, `Email ${data.id} has been sent`);
}