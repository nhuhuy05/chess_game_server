import User from "../models/User.js";
import Game from "../models/Game.js";
import Ranking from "../models/Ranking.js";
import Friendship from "../models/Friendship.js";

// Lưu lời mời chơi cờ: Key: receiverId, Value: Array of { senderId, senderName, socketPort, ip, timestamp }
const friendGameInvitations = new Map();

// Lưu thông tin game đã được tạo sau khi chấp nhận lời mời
// Key: userId, Value: { gameId, color, opponent: {...}, playerRating, opponentRating }
const friendGameInfo = new Map();

// POST /api/friends/game/invite - Gửi lời mời chơi cờ cho bạn bè
export const inviteFriendToPlay = async (req, res) => {
  const senderId = req.user?.id;
  const { friend_id, socketPort } = req.body;

  if (!senderId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (!friend_id || !socketPort || Number.isNaN(Number(socketPort))) {
    return res.status(400).json({ message: "Thiếu friend_id hoặc socketPort" });
  }

  try {
    // Kiểm tra đã là bạn bè chưa
    const isFriend = await Friendship.checkIfFriends(senderId, friend_id);
    if (!isFriend) {
      return res.status(403).json({ message: "Chỉ có thể mời bạn bè" });
    }

    // Lấy thông tin người gửi
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;

    const invitation = {
      senderId: senderId,
      senderName: sender.display_name || sender.username,
      socketPort: Number(socketPort),
      ip: ip,
      timestamp: Date.now(),
    };

    // Thêm lời mời vào danh sách của người nhận
    if (!friendGameInvitations.has(friend_id)) {
      friendGameInvitations.set(friend_id, []);
    }
    const invitations = friendGameInvitations.get(friend_id);
    
    // Xóa lời mời cũ từ cùng người gửi (nếu có)
    const existingIndex = invitations.findIndex(inv => inv.senderId === senderId);
    if (existingIndex >= 0) {
      invitations.splice(existingIndex, 1);
    }
    
    invitations.push(invitation);

    return res.status(200).json({ message: "Đã gửi lời mời chơi cờ" });
  } catch (error) {
    console.error("Lỗi khi gửi lời mời chơi cờ:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// GET /api/friends/game/invitations - Lấy danh sách lời mời chơi cờ
export const getGameInvitations = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    const invitations = friendGameInvitations.get(userId) || [];
    
    // Xóa lời mời cũ hơn 5 phút
    const now = Date.now();
    const validInvitations = invitations.filter(inv => (now - inv.timestamp) < 5 * 60 * 1000);
    friendGameInvitations.set(userId, validInvitations);

    // Lấy thông tin đầy đủ của người gửi
    const invitationsWithDetails = await Promise.all(
      validInvitations.map(async (inv) => {
        const sender = await User.findById(inv.senderId);
        return {
          senderId: inv.senderId,
          senderName: inv.senderName,
          senderUsername: sender?.username || "",
          socketPort: inv.socketPort,
          ip: inv.ip,
        };
      })
    );

    return res.status(200).json({ invitations: invitationsWithDetails });
  } catch (error) {
    console.error("Lỗi khi lấy lời mời chơi cờ:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/friends/game/accept - Chấp nhận lời mời chơi cờ
export const acceptGameInvitation = async (req, res) => {
  const receiverId = req.user?.id;
  const { sender_id } = req.body;

  if (!receiverId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (!sender_id) {
    return res.status(400).json({ message: "Thiếu sender_id" });
  }

  try {
    // Kiểm tra lời mời có tồn tại không
    const invitations = friendGameInvitations.get(receiverId) || [];
    const invitation = invitations.find(inv => inv.senderId === sender_id);

    if (!invitation) {
      return res.status(404).json({ message: "Không tìm thấy lời mời chơi cờ" });
    }

    // Xóa lời mời
    const index = invitations.findIndex(inv => inv.senderId === sender_id);
    if (index >= 0) {
      invitations.splice(index, 1);
    }

    // Kiểm tra đã là bạn bè
    const isFriend = await Friendship.checkIfFriends(receiverId, sender_id);
    if (!isFriend) {
      return res.status(403).json({ message: "Không phải bạn bè" });
    }

    // Lấy thông tin cả hai người chơi
    const sender = await User.findById(sender_id);
    const receiver = await User.findById(receiverId);
    
    if (!sender || !receiver) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;

    // Xác định màu cờ ngẫu nhiên
    const whitePlayerId = Math.random() < 0.5 ? sender_id : receiverId;
    const blackPlayerId = whitePlayerId === sender_id ? receiverId : sender_id;

    const whitePlayer = whitePlayerId === sender_id ? sender : receiver;
    const blackPlayer = blackPlayerId === sender_id ? sender : receiver;

    // Lấy thông tin P2P của người chấp nhận (không cần port vì họ là client)
    const receiverP2P = {
      id: receiverId,
      username: receiver.username,
      display_name: receiver.display_name,
      ip: ip,
      port: 0, // Không cần vì người nhận sẽ connect tới người gửi
    };

    const senderP2P = {
      id: sender_id,
      username: sender.username,
      display_name: sender.display_name,
      ip: invitation.ip,
      port: invitation.socketPort,
    };

    // Tạo game trong DB
    const newGame = await Game.create({
      player_white_id: whitePlayerId,
      player_black_id: blackPlayerId,
      mode: "friend",
    });

    // Lấy rating
    let whiteRanking = await Ranking.findByUserId(whitePlayerId);
    if (!whiteRanking) {
      await Ranking.create(whitePlayerId);
      whiteRanking = await Ranking.findByUserId(whitePlayerId);
    }

    let blackRanking = await Ranking.findByUserId(blackPlayerId);
    if (!blackRanking) {
      await Ranking.create(blackPlayerId);
      blackRanking = await Ranking.findByUserId(blackPlayerId);
    }

    // Lưu thông tin P2P cho cả hai người chơi
    const receiverInfo = {
      gameId: newGame.id,
      color: whitePlayerId === receiverId ? "white" : "black",
      opponent: whitePlayerId === receiverId ? senderP2P : receiverP2P,
      opponentName: whitePlayerId === receiverId ? sender.display_name || sender.username : receiver.display_name || receiver.username,
      playerRating: whitePlayerId === receiverId ? whiteRanking?.score || 0 : blackRanking?.score || 0,
      opponentRating: whitePlayerId === receiverId ? blackRanking?.score || 0 : whiteRanking?.score || 0,
    };

    const senderInfo = {
      gameId: newGame.id,
      color: whitePlayerId === sender_id ? "white" : "black",
      opponent: whitePlayerId === sender_id ? receiverP2P : senderP2P,
      opponentName: whitePlayerId === sender_id ? receiver.display_name || receiver.username : sender.display_name || sender.username,
      playerRating: whitePlayerId === sender_id ? whiteRanking?.score || 0 : blackRanking?.score || 0,
      opponentRating: whitePlayerId === sender_id ? blackRanking?.score || 0 : whiteRanking?.score || 0,
    };

    friendGameInfo.set(receiverId, receiverInfo);
    friendGameInfo.set(sender_id, senderInfo);

    return res.status(200).json({
      message: "Match Found!",
      gameId: newGame.id,
      color: receiverInfo.color,
      opponent: receiverInfo.opponent,
      opponentName: receiverInfo.opponentName,
      playerRating: receiverInfo.playerRating,
      opponentRating: receiverInfo.opponentRating,
    });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời chơi cờ:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/friends/game/decline - Từ chối lời mời chơi cờ
export const declineGameInvitation = async (req, res) => {
  const receiverId = req.user?.id;
  const { sender_id } = req.body;

  if (!receiverId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (!sender_id) {
    return res.status(400).json({ message: "Thiếu sender_id" });
  }

  try {
    const invitations = friendGameInvitations.get(receiverId) || [];
    const index = invitations.findIndex(inv => inv.senderId === sender_id);
    
    if (index >= 0) {
      invitations.splice(index, 1);
      return res.status(200).json({ message: "Đã từ chối lời mời" });
    }

    return res.status(404).json({ message: "Không tìm thấy lời mời" });
  } catch (error) {
    console.error("Lỗi khi từ chối lời mời:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// GET /api/friends/game/status - Kiểm tra xem có game đã được tạo chưa (cho người gửi lời mời)
export const getFriendGameStatus = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    const gameInfo = friendGameInfo.get(userId);
    if (gameInfo) {
      // Xóa thông tin sau khi lấy (chỉ lấy một lần)
      friendGameInfo.delete(userId);
      return res.status(200).json({
        message: "Match Found!",
        gameId: gameInfo.gameId,
        color: gameInfo.color,
        opponent: gameInfo.opponent,
        opponentName: gameInfo.opponentName,
        playerRating: gameInfo.playerRating,
        opponentRating: gameInfo.opponentRating,
      });
    }

    return res.status(404).json({ message: "Chưa có trận đấu" });
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái game:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

