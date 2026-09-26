import dotenv from "dotenv";
dotenv.config();

export const config = {
  mongoUri: process.env.MONGO_URI,
  port: process.env.PORT || 7000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  isProduction: process.env.IS_PRODUCTION || false,
  emailSendingDomain: process.env.EMAIL_SENDING_DOMAIN,
  emailService: process.env.EMAIL_SERVICE
};
