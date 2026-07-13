import express from "express";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { createBookController } from "../controllers/createBookController.js";
import { listBooksController } from "../controllers/listBooksController.js";
import { updateBookController } from "../controllers/updateBookController.js";

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

router.post("/", createBookController);
router.get("/", listBooksController);
router.patch("/:id", updateBookController);

export default router;
