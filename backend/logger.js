import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "logs");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      let formattedMessage = message;

      if (typeof message === "object" && message !== null) {
        formattedMessage = JSON.stringify(message, null, 2);
      }

      const metaString = Object.keys(meta).length > 0
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";

       return `[${timestamp}] ${level.toUpperCase()}: ${formattedMessage}${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: path.join(logsDir, "combined.log") }),
    new winston.transports.File({ filename: path.join(logsDir, "errors.log"), level: "error" })
  ]
});
logger.add(new DailyRotateFile({
  filename: path.join(logsDir, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "63d"
}));

export default logger;
