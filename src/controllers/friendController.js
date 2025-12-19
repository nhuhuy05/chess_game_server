import Friendship from "../models/Friendship.js";
import User from "../models/User.js";

// GET /api/friends - Lấy danh sách bạn bè
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Friendship.getFriends(userId);
    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// GET /api/friends/requests - Lấy danh sách lời mời kết bạn
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Friendship.getPendingRequests(userId);
    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Lỗi khi lấy lời mời kết bạn:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/friends/request - Gửi lời mời kết bạn
export const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { addressee_id } = req.body;

    if (!addressee_id || addressee_id === requesterId) {
      return res.status(400).json({ message: "ID người nhận không hợp lệ" });
    }

    // Kiểm tra người dùng có tồn tại không
    const user = await User.findById(addressee_id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Kiểm tra đã là bạn chưa
    const isFriend = await Friendship.checkIfFriends(requesterId, addressee_id);
    if (isFriend) {
      return res.status(400).json({ message: "Đã là bạn bè" });
    }

    // Kiểm tra đã có lời mời chưa (cả hai chiều)
    const existing = await Friendship.getFriendshipStatus(requesterId, addressee_id);
    if (existing) {
      if (existing.status === "pending") {
        // Nếu người kia đã gửi lời mời cho mình, tự động chấp nhận
        if (existing.addressee_id === requesterId && existing.requester_id === addressee_id) {
          await Friendship.acceptRequest(addressee_id, requesterId);
          return res.status(200).json({ message: "Đã tự động chấp nhận lời mời kết bạn" });
        }
        // Nếu mình đã gửi lời mời trước đó
        return res.status(400).json({ message: "Đã gửi lời mời kết bạn" });
      }
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Đã là bạn bè" });
      }
      // Nếu status là "declined", cho phép gửi lại
    }

    const result = await Friendship.sendRequest(requesterId, addressee_id);
    if (!result) {
      return res.status(400).json({ message: "Không thể gửi lời mời" });
    }

    return res.status(201).json({ message: "Đã gửi lời mời kết bạn", request: result });
  } catch (error) {
    console.error("Lỗi khi gửi lời mời kết bạn:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/friends/accept - Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (req, res) => {
  try {
    const addresseeId = req.user.id;
    const { requester_id } = req.body;

    if (!requester_id) {
      return res.status(400).json({ message: "ID người gửi không hợp lệ" });
    }

    const success = await Friendship.acceptRequest(requester_id, addresseeId);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }

    return res.status(200).json({ message: "Đã chấp nhận lời mời kết bạn" });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/friends/decline - Từ chối lời mời kết bạn
export const declineFriendRequest = async (req, res) => {
  try {
    const addresseeId = req.user.id;
    const { requester_id } = req.body;

    if (!requester_id) {
      return res.status(400).json({ message: "ID người gửi không hợp lệ" });
    }

    await Friendship.declineRequest(requester_id, addresseeId);
    return res.status(200).json({ message: "Đã từ chối lời mời kết bạn" });
  } catch (error) {
    console.error("Lỗi khi từ chối lời mời:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// DELETE /api/friends/:friendId - Xóa bạn bè
export const deleteFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);

    if (!friendId || friendId === userId) {
      return res.status(400).json({ message: "ID bạn bè không hợp lệ" });
    }

    await Friendship.deleteFriendship(userId, friendId);
    return res.status(200).json({ message: "Đã xóa bạn bè" });
  } catch (error) {
    console.error("Lỗi khi xóa bạn bè:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// GET /api/friends/search?q=... - Tìm kiếm người dùng
export const searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({ message: "Từ khóa tìm kiếm phải có ít nhất 2 ký tự" });
    }

    const users = await User.searchByUsernameOrDisplayName(searchTerm.trim(), userId);
    
    // Thêm thông tin trạng thái bạn bè cho mỗi user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await Friendship.getFriendshipStatus(userId, user.id);
        return {
          ...user,
          friendship_status: friendship ? friendship.status : null,
          is_friend: friendship && friendship.status === "accepted",
          can_send_request: !friendship || friendship.status === "declined",
        };
      })
    );

    return res.status(200).json({ users: usersWithStatus });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

