import Ranking from "../models/Ranking.js";
import Friendship from "../models/Friendship.js";

// GET /api/leaderboard - Lấy bảng xếp hạng
export const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit) || 50; // Mặc định top 50

    const topPlayers = await Ranking.getTopPlayers(limit);

    // Nếu có userId, thêm thông tin trạng thái bạn bè cho mỗi người
    if (userId) {
      const playersWithFriendship = await Promise.all(
        topPlayers.map(async (player) => {
          // Bỏ qua chính mình
          if (player.id === userId) {
            return {
              ...player,
              is_self: true,
              friendship_status: null,
              is_friend: false,
              can_send_request: false,
            };
          }

          const friendship = await Friendship.getFriendshipStatus(userId, player.id);
          return {
            ...player,
            is_self: false,
            friendship_status: friendship ? friendship.status : null,
            is_friend: friendship && friendship.status === "accepted",
            can_send_request: !friendship || friendship.status === "declined",
          };
        })
      );

      return res.status(200).json({ leaderboard: playersWithFriendship });
    }

    // Không có userId (public access - không cần auth)
    return res.status(200).json({ leaderboard: topPlayers });
  } catch (error) {
    console.error("Lỗi khi lấy bảng xếp hạng:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};








