import dotenv from "dotenv";
dotenv.config();

export const config = {
  mongoUser: process.env.MONGO_USER,
  mongoPassword: process.env.MONGO_PASSWORD,
  mongoClusterHost: process.env.MONGO_CLUSTER_HOST,
  port: process.env.PORT || 7000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
};
