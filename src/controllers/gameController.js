import User from "../models/User.js";
import Game from "../models/Game.js";
import Ranking from "../models/Ranking.js";

// Hàng đợi ghép trận trong bộ nhớ
// Key: userId, Value: thông tin cơ bản của người chơi (kèm IP/port để P2P)
const matchmakingQueue = new Map();

// Lưu tạm thông tin P2P sau khi đã ghép để client khác (người vào hàng đợi trước)
// có thể lấy qua /status. Key: userId, Value: { gameId, color, opponent: { ... } }
const p2pInfoByUser = new Map();

// POST /api/matchmaking/join
export const joinMatchmaking = async (req, res) => {
  const userId = req.user?.id;
  const socketPort = req.body?.socketPort;
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    null;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (!socketPort || Number.isNaN(Number(socketPort))) {
    return res
      .status(400)
      .json({ message: "Thiếu hoặc sai socketPort để thiết lập P2P" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Nếu đã trong hàng đợi thì chỉ báo vẫn đang chờ
    if (matchmakingQueue.has(userId)) {
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    }

    // Thêm người chơi vào hàng đợi
    const player = {
      id: userId,
      username: user.username,
      display_name: user.display_name,
      ip,
      port: Number(socketPort),
    };
    matchmakingQueue.set(userId, player);
    console.log(
      `User ${user.username} joined queue. Size: ${matchmakingQueue.size}`
    );

    // Nếu chưa đủ 2 người thì tiếp tục chờ
    if (matchmakingQueue.size < 2) {
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    }

    // Lấy 2 người chơi đầu tiên trong hàng đợi (ghép ngẫu nhiên màu cờ)
    const iterator = matchmakingQueue.entries();
    const first = iterator.next().value;
    const second = iterator.next().value;

    if (!first || !second) {
      // Trường hợp hiếm khi một người rời hàng đợi giữa lúc xử lý
      return res
        .status(202)
        .json({ message: "Đang tìm trận đấu...", note: "Chờ thêm người chơi" });
    }

    const [player1Id, player1] = first;
    const [player2Id, player2] = second;

    matchmakingQueue.delete(player1Id);
    matchmakingQueue.delete(player2Id);

    const [whitePlayer, blackPlayer] =
      Math.random() < 0.5 ? [player1, player2] : [player2, player1];

    // Tạo bản ghi game trong DB, mode cố định 'random'
    const newGame = await Game.create({
      player_white_id: whitePlayer.id,
      player_black_id: blackPlayer.id,
      mode: "random",
    });

    // Lấy rating cho cả hai người chơi
    let whiteRanking = await Ranking.findByUserId(whitePlayer.id);
    if (!whiteRanking) {
      await Ranking.create(whitePlayer.id);
      whiteRanking = await Ranking.findByUserId(whitePlayer.id);
    }

    let blackRanking = await Ranking.findByUserId(blackPlayer.id);
    if (!blackRanking) {
      await Ranking.create(blackPlayer.id);
      blackRanking = await Ranking.findByUserId(blackPlayer.id);
    }

    // Lưu thông tin P2P cho cả hai người chơi để client có thể lấy qua /status
    p2pInfoByUser.set(whitePlayer.id, {
      gameId: newGame.id,
      color: "white",
      opponent: {
        id: blackPlayer.id,
        username: blackPlayer.username,
        display_name: blackPlayer.display_name,
        ip: blackPlayer.ip,
        port: blackPlayer.port,
        rating: blackRanking?.score || 0,
      },
      playerRating: whiteRanking?.score || 0,
    });

    p2pInfoByUser.set(blackPlayer.id, {
      gameId: newGame.id,
      color: "black",
      opponent: {
        id: whitePlayer.id,
        username: whitePlayer.username,
        display_name: whitePlayer.display_name,
        ip: whitePlayer.ip,
        port: whitePlayer.port,
        rating: whiteRanking?.score || 0,
      },
      playerRating: blackRanking?.score || 0,
    });

    // Xác định người gọi API là bên nào để trả về màu + P2P đúng
    const selfInfo = p2pInfoByUser.get(userId);

    return res.status(200).json({
      message: "Match Found!",
      gameId: selfInfo.gameId,
      opponent: selfInfo.opponent,
      color: selfInfo.color,
      playerRating: selfInfo.playerRating,
    });
  } catch (error) {
    console.error("Lỗi khi tham gia ghép đôi:", error);
    matchmakingQueue.delete(userId);
    return res.status(500).json({ message: "Lỗi hệ thống khi tìm trận đấu" });
  }
};

// GET /api/matchmaking/status
export const checkMatchStatus = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    // Nếu đã có thông tin P2P được lưu sẵn (đã ghép xong)
    if (p2pInfoByUser.has(userId)) {
      const info = p2pInfoByUser.get(userId);
      // Có thể xóa sau khi client đã lấy để tránh rò rỉ bộ nhớ
      p2pInfoByUser.delete(userId);

      return res.status(200).json({
        message: "Match Found!",
        gameId: info.gameId,
        opponent: info.opponent,
        color: info.color,
        playerRating: info.playerRating,
      });
    }

    // Chưa ghép xong nhưng vẫn đang trong hàng đợi
    if (matchmakingQueue.has(userId)) {
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    }

    // Không có trong hàng đợi và cũng không có thông tin P2P
    return res
      .status(404)
      .json({ message: "Không tìm thấy yêu cầu tìm trận đấu" });
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// DELETE /api/matchmaking/leave
export const leaveMatchmaking = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  const removed = matchmakingQueue.delete(userId);

  if (removed) {
    console.log(`User ${userId} left queue. Size: ${matchmakingQueue.size}`);
    return res.sendStatus(204);
  }

  return res
    .status(404)
    .json({ message: "Người dùng không có trong hàng đợi" });
};

// POST /api/games/:gameId/end
export const endGame = async (req, res) => {
  const userId = req.user?.id;
  const gameId = req.params.gameId;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Trận đấu không tồn tại" });
    }

    // Kiểm tra người chơi có tham gia trận đấu này không
    if (game.player_white_id !== userId && game.player_black_id !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn không tham gia trận đấu này" });
    }

    // Kiểm tra trận đấu đã kết thúc chưa
    if (game.status === "finished") {
      return res.status(400).json({ message: "Trận đấu đã kết thúc" });
    }

    const { winnerColor, result } = req.body;

    // Xác định kết quả
    let winnerId = null;
    let whiteResult = "draw";
    let blackResult = "draw";

    if (result === "draw") {
      // Hòa
      whiteResult = "draw";
      blackResult = "draw";
    } else if (winnerColor === "white") {
      winnerId = game.player_white_id;
      whiteResult = "win";
      blackResult = "loss";
    } else if (winnerColor === "black") {
      winnerId = game.player_black_id;
      whiteResult = "loss";
      blackResult = "win";
    }

    // Cập nhật game
    if (winnerId) {
      await Game.setWinner(gameId, winnerId);
    } else {
      await Game.updateStatus(gameId, "finished");
    }

    // Cập nhật ranking cho cả hai người chơi
    // Đảm bảo ranking tồn tại
    let whiteRanking = await Ranking.findByUserId(game.player_white_id);
    if (!whiteRanking) {
      await Ranking.create(game.player_white_id);
    }
    await Ranking.updateAfterGame(game.player_white_id, whiteResult);

    let blackRanking = await Ranking.findByUserId(game.player_black_id);
    if (!blackRanking) {
      await Ranking.create(game.player_black_id);
    }
    await Ranking.updateAfterGame(game.player_black_id, blackResult);

    return res.status(200).json({
      message: "Trận đấu đã được cập nhật",
      gameId: gameId,
      winnerId: winnerId,
      result: result || (winnerId ? "win" : "draw"),
    });
  } catch (error) {
    console.error("Lỗi khi kết thúc trận đấu:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
