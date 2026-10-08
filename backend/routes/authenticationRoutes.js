import express from "express";
import { registerController, registerControllerWithoutEmailConfirmation } from "../controllers/registerController.js";
import { loginController } from "../controllers/loginController.js";
import { logoutController } from "../controllers/logoutController.js";
import { sendEmailConfirmationController } from "../controllers/sendEmailController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { updateLoginSession } from "../services/sessionService.js";
import { deleteUserController } from "../controllers/deleteUserController.js";
import { emailConfirmationController } from "../controllers/emailConfirmationController.js";
import { config } from "../configs/config.js";

const router = express.Router();

router.use(checkDatabaseForAuth);

router.post("/logout", logoutController);

router.post("/login", loginController);

if (config.skipEmailConfirmation === true) {
  router.post("/register", registerControllerWithoutEmailConfirmation);
} else {
  router.post("/register", registerController, sendEmailConfirmationController);
}


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
