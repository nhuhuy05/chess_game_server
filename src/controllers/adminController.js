import User from "../models/User.js";
import Game from "../models/Game.js";
import Ranking from "../models/Ranking.js";
import Token from "../models/Token.js";
import bcrypt from "bcrypt";
import db from "../config/db.js";

// Lấy danh sách tất cả người dùng (có phân trang)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    
    let users = await User.findAll();
    
    // Lọc theo search nếu có
    if (search) {
      users = users.filter(user => 
        user.username?.toLowerCase().includes(search.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Tính toán phân trang
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Loại bỏ password khỏi kết quả
    const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

    return res.status(200).json({
      users: safeUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Lấy thông tin chi tiết của một user (bao gồm cả ranking)
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const ranking = await Ranking.findByUserId(id);
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
    console.error("Lỗi khi lấy chi tiết user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Cập nhật thông tin user (bao gồm role, is_active)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, phone, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const updateData = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu để cập nhật" });
    }

    // Kiểm tra email trùng lặp nếu có thay đổi email
    if (updateData.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        return res.status(409).json({ message: "Email đã được sử dụng" });
      }
    }

    const updatedUser = await User.update(id, updateData);
    const { password, ...safeUser } = updatedUser;

    return res.status(200).json({
      message: "Cập nhật thông tin người dùng thành công",
      user: safeUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Cấm/khóa tài khoản user
export const banUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Không cho phép admin tự ban chính mình
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        message: "Không thể khóa tài khoản của chính mình" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    await User.updateActiveState(id, false);
    
    // Xóa tất cả refresh token của user bị ban
    await Token.deleteByUser(id);

    return res.status(200).json({ 
      message: "Đã khóa tài khoản người dùng thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi ban user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Mở khóa tài khoản user
export const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    await User.updateActiveState(id, true);

    return res.status(200).json({ 
      message: "Đã mở khóa tài khoản người dùng thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi unban user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Xóa user (chỉ dành cho admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Không cho phép admin tự xóa chính mình
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        message: "Không thể xóa tài khoản của chính mình" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Xóa tất cả token của user
    await Token.deleteByUser(id);

    // Xóa user
    await User.delete(id);

    return res.status(200).json({ 
      message: "Đã xóa người dùng thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi xóa user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Đặt lại mật khẩu cho user
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Mật khẩu mới phải có ít nhất 6 ký tự" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(id, hashedPassword);

    // Xóa tất cả token của user để buộc đăng nhập lại
    await Token.deleteByUser(id);

    return res.status(200).json({ 
      message: "Đã đặt lại mật khẩu thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi reset password:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Thống kê tổng quan hệ thống
export const getSystemStats = async (req, res) => {
  try {
    const allUsers = await User.findAll();
    const allGames = await Game.findAll();

    const stats = {
      users: {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length,
        banned: allUsers.filter(u => !u.is_active).length,
        online: allUsers.filter(u => u.status === "online" && u.role === "user").length,
        admins: allUsers.filter(u => u.role === "admin").length,
      },
      games: {
        total: allGames.length,
        completed: allGames.filter(g => g.status === "completed").length,
        ongoing: allGames.filter(g => g.status === "ongoing").length,
        draws: allGames.filter(g => g.result === "draw").length,
      },
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Thăng cấp user thành admin
export const promoteToAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ 
        message: "Người dùng đã là admin rồi" 
      });
    }

    await User.update(id, { role: "admin" });

    return res.status(200).json({ 
      message: "Đã thăng cấp người dùng lên admin thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi promote user:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Hạ cấp admin thành user thông thường
export const demoteFromAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Không cho phép admin tự hạ cấp chính mình
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        message: "Không thể tự hạ cấp chính mình" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ 
        message: "Người dùng không phải là admin" 
      });
    }

    await User.update(id, { role: "user" });

    return res.status(200).json({ 
      message: "Đã hạ cấp admin xuống user thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi demote admin:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ==================== QUẢN LÝ TRẬN ĐẤU ====================

// Lấy danh sách tất cả trận đấu
export const getAllGames = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    
    let query = `
      SELECT g.*, 
             uw.username as white_username, uw.display_name as white_display_name,
             ub.username as black_username, ub.display_name as black_display_name,
             winner.username as winner_username, winner.display_name as winner_display_name
      FROM games g
      LEFT JOIN users uw ON g.player_white_id = uw.id
      LEFT JOIN users ub ON g.player_black_id = ub.id
      LEFT JOIN users winner ON g.winner_id = winner.id
    `;

    const params = [];
    if (status) {
      query += " WHERE g.status = ?";
      params.push(status);
    }

    query += " ORDER BY g.id DESC";

    const [allGames] = await db.promise().query(query, params);
    
    // Phân trang
    const total = allGames.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedGames = allGames.slice(startIndex, endIndex);

    return res.status(200).json({
      games: paginatedGames,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách trận đấu:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Lấy chi tiết trận đấu
export const getGameDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [games] = await db.promise().query(`
      SELECT g.*, 
             uw.username as white_username, uw.display_name as white_display_name,
             ub.username as black_username, ub.display_name as black_display_name,
             winner.username as winner_username, winner.display_name as winner_display_name
      FROM games g
      LEFT JOIN users uw ON g.player_white_id = uw.id
      LEFT JOIN users ub ON g.player_black_id = ub.id
      LEFT JOIN users winner ON g.winner_id = winner.id
      WHERE g.id = ?
    `, [id]);

    if (games.length === 0) {
      return res.status(404).json({ message: "Trận đấu không tồn tại" });
    }

    return res.status(200).json(games[0]);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết trận đấu:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Xóa trận đấu
export const deleteGame = async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ message: "Trận đấu không tồn tại" });
    }

    await Game.delete(id);

    return res.status(200).json({ 
      message: "Đã xóa trận đấu thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi xóa trận đấu:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ==================== QUẢN LÝ XẾP HẠNG ====================

// Lấy danh sách xếp hạng
export const getAllRankings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const [allRankings] = await db.promise().query(`
      SELECT r.*, u.username, u.display_name, u.avatar, u.status
      FROM rankings r
      JOIN users u ON r.user_id = u.id
      WHERE u.is_active = TRUE AND u.role = 'user'
      ORDER BY r.score DESC, r.wins DESC
    `);
    
    // Phân trang
    const total = allRankings.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRankings = allRankings.slice(startIndex, endIndex);

    return res.status(200).json({
      rankings: paginatedRankings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách xếp hạng:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Cập nhật điểm xếp hạng của user
export const updateRanking = async (req, res) => {
  try {
    const { userId } = req.params;
    const { gamesPlayed, wins, losses, draws, score } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    let ranking = await Ranking.findByUserId(userId);
    if (!ranking) {
      await Ranking.create(userId);
      ranking = await Ranking.findByUserId(userId);
    }

    const updateData = {};
    if (gamesPlayed !== undefined) updateData.games_played = gamesPlayed;
    if (wins !== undefined) updateData.wins = wins;
    if (losses !== undefined) updateData.losses = losses;
    if (draws !== undefined) updateData.draws = draws;
    if (score !== undefined) updateData.score = score;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu để cập nhật" });
    }

    await Ranking.update(userId, updateData);
    const updatedRanking = await Ranking.findByUserId(userId);

    return res.status(200).json({
      message: "Cập nhật xếp hạng thành công",
      ranking: updatedRanking,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật xếp hạng:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Reset xếp hạng của user về 0
export const resetRanking = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    await Ranking.update(userId, {
      games_played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      score: 0,
    });

    return res.status(200).json({ 
      message: "Đã reset xếp hạng thành công" 
    });
  } catch (error) {
    console.error("Lỗi khi reset xếp hạng:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

