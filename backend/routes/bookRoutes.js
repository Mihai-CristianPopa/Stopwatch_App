import express from "express";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { createBookController } from "../controllers/createBookController.js";
import { listBooksController } from "../controllers/listBooksController.js";
import { updateBookController } from "../controllers/updateBookController.js";
import { reorderBooksController } from "../controllers/reorderBooksController.js";
import { createBooksBatchController } from "../controllers/createBooksBatchController.js";

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

router.post("/batch", createBooksBatchController);
router.post("/", createBookController);
router.get("/", listBooksController);
router.patch("/reorder", reorderBooksController);
router.patch("/:id", updateBookController);

export default router;
