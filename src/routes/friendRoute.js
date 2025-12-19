import express from "express";
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  searchUsers,
} from "../controllers/friendController.js";
import {
  inviteFriendToPlay,
  getGameInvitations,
  acceptGameInvitation,
  declineGameInvitation,
  getFriendGameStatus,
} from "../controllers/friendGameController.js";

const router = express.Router();

// GET /api/friends - Lấy danh sách bạn bè
router.get("/", getFriends);

// GET /api/friends/requests - Lấy lời mời kết bạn
router.get("/requests", getFriendRequests);

// GET /api/friends/search?q=... - Tìm kiếm người dùng
router.get("/search", searchUsers);

// POST /api/friends/request - Gửi lời mời kết bạn
router.post("/request", sendFriendRequest);

// POST /api/friends/accept - Chấp nhận lời mời
router.post("/accept", acceptFriendRequest);

// POST /api/friends/decline - Từ chối lời mời
router.post("/decline", declineFriendRequest);

// DELETE /api/friends/:friendId - Xóa bạn bè
router.delete("/:friendId", deleteFriend);

// Game invitations
// POST /api/friends/game/invite - Gửi lời mời chơi cờ
router.post("/game/invite", inviteFriendToPlay);

// GET /api/friends/game/invitations - Lấy lời mời chơi cờ
router.get("/game/invitations", getGameInvitations);

// GET /api/friends/game/status - Kiểm tra game đã được tạo (cho người gửi)
router.get("/game/status", getFriendGameStatus);

// POST /api/friends/game/accept - Chấp nhận lời mời chơi cờ
router.post("/game/accept", acceptGameInvitation);

// POST /api/friends/game/decline - Từ chối lời mời chơi cờ
router.post("/game/decline", declineGameInvitation);

export default router;

