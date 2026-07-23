import { createTransport } from "nodemailer";
import { emailConfirmationHtml } from "../utils/emailConfirmationHtmlWrapper.js";
import { config } from "../configs/config.js";
// Pass in the new user including the email and the userId
export const sendMail = async (receiver) => {
    const confirmationUrl = (config.isProduction ? "https://stopwatch-tracker.onrender.com" : "http://localhost:7000/") + "auth/email-confirmation?userId=" + receiver.userId + "&token=" + receiver.token;  
    const email = emailConfirmationHtml(confirmationUrl);

    const transporter = createTransport({
        service: "Mailgun", // Use any Service ID from the table below (matching is case-insensitive)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }); 

    // const receiver = "mihaipopa00@gmail.com"
    
// postmaster@sandboxfc10e6a9fc394c2087aabb9cfbf05029.mailgun.org
    const info = await transporter.sendMail({
        from: 'postmaster@sandboxfc10e6a9fc394c2087aabb9cfbf05029.mailgun.org', // sender address
        to: receiver.email, // list of recipients
        subject: "Hello with html", // subject line
        // text: "Hello world test?", // plain text body
        html: email, // HTML body
    });
    console.log("Message sent:", info.messageId);
    return info;
}
