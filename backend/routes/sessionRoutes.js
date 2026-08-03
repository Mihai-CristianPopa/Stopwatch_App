import express from "express";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { stopwatchStateController } from "../controllers/stopwatchStateController.js";

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

router.put("/stopwatch-state", stopwatchStateController);

export default router;
