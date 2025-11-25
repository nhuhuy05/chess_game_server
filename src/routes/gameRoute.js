import express from 'express';
import { joinMatchmaking, checkMatchStatus, leaveMatchmaking } from '../controllers/gameController.js'

const router = express.Router();

// Tất cả các route này cần được bảo vệ bằng xác thực
router.post("/join", joinMatchmaking);
router.get("/status", checkMatchStatus);
router.delete("/leave", leaveMatchmaking);

export default router;