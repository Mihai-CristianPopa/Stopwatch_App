import express from "express";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { checkDatabaseForAuth } from "../middleware/dbIsUpMiddleware.js";
import { stopwatchStateController } from "../controllers/stopwatchStateController.js";
import { addClient, removeClient } from '../sse.js'

const router = express.Router();

router.use(checkDatabaseForAuth);
router.use(requireAuthentication);

// SSE endpoint — each tab connects here on load
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const userId = req.user.id.toString()  // already set by requireAuthentication
    addClient(userId, res)

    req.on('close', () => removeClient(userId, res))
});

router.put("/stopwatch-state", stopwatchStateController);



export default router;
