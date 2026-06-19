import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./logger.js";
import dbClient from "./db/mongoClient.js";
import authenticationRoutes from "./routes/authenticationRoutes.js";
import intervalRoutes from "./routes/intervalRoutes.js";
import { config } from "./configs/config.js";
import { ensureIndexes } from "./services/intervalService.js";
import { sendMail } from "./services/mailService.js";

const app = express();
const port = config.port;
const frontendOrigin = config.frontendOrigin;

app.use(cors({ origin: [frontendOrigin, "http://localhost:5500", "http://127.0.0.1:5500", "https://mihai-cristianpopa.github.io"], credentials: true }));
app.use(express.json());
app.use(cookieParser());

function setupRoutes() {
  app.use("/authentication", authenticationRoutes);
  app.use("/intervals", intervalRoutes);

  app.get("/health", async (req, res) => {
    if (app.locals.dbIsDown) {
      await connectToDatabase();
    }
    res.status(200).json({
      status: app.locals.dbIsDown ? "DEGRADED" : "OK",
      database: app.locals.dbIsDown ? "DOWN" : "UP",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/send-mail", async(req, res) => {
    try {
      const info = await sendMail("mihaipopa00@gmail.com");
      if (info.rejected.length > 0) {
        return res.status(500).json({
          statusCode: 500,
          message: "Something went wrong for: " + info.rejected
        });
      }
      return res.status(200).json({
        statusCode: 200,
        message: "Email successfully sent."
      });
    } catch (error) {
        res.status(500).json({
          statusCode: 500,
          message: "Something went wrong"
        });
    }
    
  })
}

async function connectToDatabase() {
  try {
    await dbClient.connect();
    logger.info("Connection to MongoDB provided");
    app.locals.dbIsDown = false;
  } catch (mongoError) {
    logger.error("Connection to MongoDB failed");
    app.locals.dbIsDown = true;
  }
}

async function startServer() {
  await connectToDatabase();

  if (!app.locals.dbIsDown) {
    try {
      await ensureIndexes();
    } catch (err) {
      logger.error("Failed to ensure indexes on startup", err);
    }
  }

  setupRoutes();

  app.listen(port, () => {
    logger.info(`Stopwatch server running on http://localhost:${port}`);
    logger.info(`Accepting CORS from ${frontendOrigin} and http://127.0.0.1:5500`);
    logger.info(`Database status: ${app.locals.dbIsDown ? 'DOWN' : 'UP'}`);
  });
}

startServer();
