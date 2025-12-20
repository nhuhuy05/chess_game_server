import express from "express";
import {
  getAllUsers,
  getUserDetails,
  updateUser,
  banUser,
  unbanUser,
  deleteUser,
  resetUserPassword,
  getSystemStats,
  promoteToAdmin,
  demoteFromAdmin,
  getAllGames,
  getGameDetails,
  deleteGame,
  getAllRankings,
  updateRanking,
  resetRanking,
} from "../controllers/adminController.js";
import { adminOnly } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// Tất cả routes dưới đây đều yêu cầu quyền admin
router.use(adminOnly);

// Thống kê tổng quan hệ thống
router.get("/stats", getSystemStats);

// Quản lý users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Khóa/mở khóa tài khoản
router.post("/users/:id/ban", banUser);
router.post("/users/:id/unban", unbanUser);

// Reset mật khẩu
router.post("/users/:id/reset-password", resetUserPassword);

// Quản lý quyền admin
router.post("/users/:id/promote", promoteToAdmin);
router.post("/users/:id/demote", demoteFromAdmin);

// Quản lý trận đấu
router.get("/games", getAllGames);
router.get("/games/:id", getGameDetails);
router.delete("/games/:id", deleteGame);

// Quản lý xếp hạng
router.get("/rankings", getAllRankings);
router.put("/rankings/:userId", updateRanking);
router.post("/rankings/:userId/reset", resetRanking);

export default router;

