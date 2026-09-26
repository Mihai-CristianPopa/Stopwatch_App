import { createTransport } from "nodemailer";
import { emailConfirmationHtml } from "../utils/emailConfirmationHtmlWrapper.js";
import { config } from "../configs/config.js";
// Pass in the new user including the email and the userId
export const sendMail = async (receiver) => {
    const confirmationUrl = (config.isProduction ? "https://stopwatch-tracker.onrender.com" : "http://localhost:7000/") + "authentication/email-confirmation?userId=" + receiver.userId + "&token=" + receiver.token;  
    const email = emailConfirmationHtml(confirmationUrl);

    const transporter = createTransport({
        service: config.emailService, // Use any Service ID from the table below (matching is case-insensitive)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }); 

    const info = await transporter.sendMail({
        from: `Stopwatch Tracker <no-reply@${config.emailSendingDomain}>`, // sender address
        to: receiver.email, // list of recipients
        subject: "Confirm your Stopwatch Tracker account", // subject line
        html: email, // HTML body
    });
    return info;
}
