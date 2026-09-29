import { createTransport } from "nodemailer";
import { config } from "../configs/config.js";

const createEmailTransporter = () => {
    return createTransport({
        service: config.emailService, // Use any Service ID from the table below (matching is case-insensitive)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }); 
}

/** emailObject must contain from, to, subject and html. */
export const sendEmail = async (emailObject) => {
    const transporter = createEmailTransporter();

    const info = await transporter.sendMail(emailObject);
    return info;
}