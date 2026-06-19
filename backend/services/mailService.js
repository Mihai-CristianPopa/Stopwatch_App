import { createTransport } from "nodemailer";
import { emailConfirmationHtml } from "../utils/emailConfirmationHtmlWrapper.js";
export const sendMail = async (receiver) => {
    const email = emailConfirmationHtml("localhost:7000/health");
    // emailConfirmationH

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
        to: receiver, // list of recipients
        subject: "Hello with html", // subject line
        // text: "Hello world test?", // plain text body
        html: email, // HTML body
    });
    console.log("Message sent:", info.messageId);
    return info;
}
