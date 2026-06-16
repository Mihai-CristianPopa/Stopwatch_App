import express from "express";
import { registerController } from "../controllers/registerController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { updateLoginSession } from "../services/sessionService.js";

const router = express.Router();

router.use(checkDatabaseForAuth);

router.post("/logout", logoutController);

router.post("/login", loginController);

router.post("/register", registerController);

router.get("/me", requireAuthentication, (req, res) => {
  updateLoginSession(req.sid, new Date().toISOString());
  return res.status(200).json({
      message: "User authenticated successfully.",
      user: req.user
    });
});

export default router;
