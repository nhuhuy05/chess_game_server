import bcrypt from "bcrypt";
import User from "../models/User.js";
import Token from "../models/Token.js";
import Ranking from "../models/Ranking.js";

// Lấy thông tin profile của user hiện tại (kèm ranking)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Lấy ranking
    let ranking = await Ranking.findByUserId(userId);
    if (!ranking) {
      // Tạo ranking mặc định nếu chưa có
      await Ranking.create(userId);
      ranking = await Ranking.findByUserId(userId);
    }

    const { password, ...safeUser } = user;
    return res.status(200).json({
      ...safeUser,
      ranking: ranking || {
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        score: 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy profile:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Lấy thông tin user theo ID (public, không trả mật khẩu)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const { password, ...publicInfo } = user;
    return res.status(200).json(publicInfo);
  } catch (error) {
    console.error("Lỗi khi lấy user theo ID:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Cập nhật thông tin profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, email, phone, avatar } = req.body;

    const updateData = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có thông tin nào để cập nhật" });
    }

    // Nếu có email mới thì check trùng
    if (updateData.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Email đã được sử dụng" });
      }
    }

    const updatedUser = await User.update(userId, updateData);
    const { password, ...safeUser } = updatedUser;

    return res.status(200).json({
      message: "Cập nhật profile thành công",
      user: safeUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật profile:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới",
      });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(userId, hashedPassword);

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Xóa tài khoản
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập mật khẩu để xác nhận" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }

    // Xóa toàn bộ refresh token của user
    await Token.deleteByUser(userId);

    // Xóa user
    await User.delete(userId);

    return res
      .status(200)
      .json({ message: "Tài khoản đã được xóa thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa tài khoản:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
