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

const sendEmailRequest = (transporter, emailObject, startTime) => {
    transporter.sendMail(emailObject)
    .then((info) => {
        infoLogMessage(startTime, `The info object from sendEmailRequest ${info}`);
        if (info.rejected.length === 0) {
            infoLogMessage(startTime, `Email was finally sent to ${emailObject.to}`);
        } else {
            infoLogMessage(startTime, `Something went wrong with the email sending to ${emailObject.to}`);
        }
    })
    .catch((error)=> {
        infoLogMessage(startTime, `Something went wrong with the email sending ${error}`);
    })
    infoLogMessage(startTime, `Email request has been sent, transporter._eventsCount: ${transporter._eventsCount}.`);
}

/** emailObject must contain from, to, subject and html. */
export const sendEmail = async (emailObject, startTime) => {
    infoLogMessage(startTime, "Calling createEmailTransporter method");
    const transporter = createEmailTransporter();
    infoLogMessage(startTime, `Calling transporter.sendMail, transporter._eventsCount: ${transporter._eventsCount}`);
    sendEmailRequest(transporter, emailObject, startTime);
    // const info = await transporter.sendMail(emailObject);
    // return info;
}