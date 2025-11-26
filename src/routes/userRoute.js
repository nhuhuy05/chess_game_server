import express from "express";
import {
  getProfile,
  getUserById,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../controllers/userController.js";

const router = express.Router();

// Lấy profile user hiện tại (dựa trên JWT)
router.get("/me", getProfile);

// Cập nhật profile user hiện tại
router.put("/me", updateProfile);

// Đổi mật khẩu
router.put("/me/password", changePassword);

// Xóa tài khoản hiện tại
router.delete("/me", deleteAccount);

// Lấy thông tin public của 1 user bất kỳ theo id
router.get("/:id", getUserById);

export default router;
