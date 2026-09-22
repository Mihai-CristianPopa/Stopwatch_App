import express from "express";
import { registerController } from "../controllers/registerController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { sendEmailController } from "../controllers/sendEmailController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { updateLoginSession } from "../services/sessionService.js";
import { deleteUserController } from "../controllers/deleteUserController.js";
import { emailConfirmationController } from "../controllers/emailConfirmationController.js";

const router = express.Router();

router.use(checkDatabaseForAuth);

router.post("/logout", logoutController);

router.post("/login", loginController);

router.post("/register", registerController, sendEmailController);

router.delete("/delete-user", deleteUserController);

router.get("/email-confirmation", emailConfirmationController);

router.get("/me", requireAuthentication, (req, res) => {
  updateLoginSession(req.parentSid, new Date().toISOString());
  return res.status(200).json({
      message: "User authenticated successfully.",
      user: req.user,
      stopwatch_start_time: req.stopwatchStartTime
    });
});

export default router;
