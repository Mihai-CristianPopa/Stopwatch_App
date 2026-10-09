import { createTransport } from "nodemailer";
import { config } from "../configs/config.js";
import { infoLogMessage } from "../loggerHelper.js";

const createEmailTransporter = () => {
    return createTransport({
        service: config.emailService, // Use any Service ID from the table below (matching is case-insensitive)
        auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
        },
    }); 
}

/** emailObject must contain from, to, subject and html. */
export const sendEmail = async (emailObject, startTime) => {
    infoLogMessage(startTime, "Calling createEmailTransporter method");
    const transporter = createEmailTransporter();
    infoLogMessage(startTime, String(transporter) + `Calling transporter.sendMail, transporter._eventsCount: ${transporter._eventsCount}`);
    if (!true) {
        const info = await transporter.sendMail(emailObject);
        return info;
    }
    return;
}