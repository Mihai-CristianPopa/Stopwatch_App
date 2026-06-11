import express from "express";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { createIntervalController } from "../controllers/createIntervalController.js";
import { listDailyTotalsController } from "../controllers/listDailyTotalsController.js";

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

router.post("/", createIntervalController);
router.get("/daily-totals", listDailyTotalsController);

export default router;
