import express from "express";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/leaderboard - Lấy bảng xếp hạng (có thể public hoặc protected)
// Nếu có auth thì sẽ có thêm thông tin bạn bè
router.get("/", protectedRoute, getLeaderboard);

export default router;








