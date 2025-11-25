import User from "../models/User.js"; // Để lấy thông tin người chơi
import Game from "../models/Game.js"; // Giả định bạn có Game Model

// Key: userId, Value: { id: userId, socketId: '...', ...} (chỉ dùng userId trong REST)
const matchmakingQueue = new Map();

export const joinMatchmaking = async (req, res) => {
  // Giả định req.userId được lấy từ JWT trong middleware Auth

  const userId = req.user.id;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // 1. Nếu người dùng đã trong hàng đợi, trả về trạng thái đang chờ
    if (matchmakingQueue.has(userId)) {
      // Mặc dù đã có, vẫn trả về 202 để Client biết vẫn đang chờ
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    }

    // 2. Thêm người dùng vào hàng đợi
    const player = {
      id: userId,
      username: user.username,
      display_name: user.display_name,
    };
    matchmakingQueue.set(userId, player);
    console.log(
      `User ${user.username} joined queue. Size: ${matchmakingQueue.size}`
    );

    // 3. Kiểm tra ghép đôi
    if (matchmakingQueue.size >= 2) {
      // Lấy 2 người chơi đầu tiên
      const [player1Id, player1] = matchmakingQueue.entries().next().value;
      matchmakingQueue.delete(player1Id);

      // Lấy người chơi thứ 2 (là người vừa gửi request)
      const player2Id = userId; // Đã có sẵn userId
      const player2 = matchmakingQueue.get(player2Id);
      matchmakingQueue.delete(player2Id);

      // 4. Tạo Game mới trong DB
      const [whitePlayer, blackPlayer] =
        Math.random() < 0.5 ? [player1, player2] : [player2, player1];

      const newGame = await Game.create({
        player_white_id: whitePlayer.id,
        player_black_id: blackPlayer.id,
        // ... các thông số game
      });

      // 5. Trả về thông tin trận đấu cho người chơi vừa gửi request (player2)
      const opponent =
        player2.id === whitePlayer.id ? blackPlayer : whitePlayer;
      const color = player2.id === whitePlayer.id ? "white" : "black";

      return res.status(200).json({
        message: "Match Found!",
        gameId: newGame.id,
        opponent: {
          id: opponent.id,
          username: opponent.username,
          display_name: opponent.display_name,
        },
        color: color,
        // Client cần biết ai là White/Black và Game ID để bắt đầu P2P
      });
    } else {
      // Vẫn còn ít hơn 2 người trong hàng đợi
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    }
  } catch (error) {
    console.error("Lỗi khi tham gia ghép đôi:", error.message);
    // Đảm bảo người dùng bị lỗi được xóa khỏi queue để tránh kẹt
    matchmakingQueue.delete(userId);
    return res.status(500).json({ message: "Lỗi hệ thống khi tìm trận đấu" });
  }
};

export const checkMatchStatus = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  try {
    // 1. Kiểm tra xem người dùng đã có Game nào đang chờ họ chưa
    // Giả định Game Model có hàm findPendingGameForUser
    const pendingGame = await Game.findPendingGameForUser(userId);

    if (pendingGame) {
      // 2. Nếu tìm thấy Game, trả về thông tin
      const isWhite = pendingGame.player_white_id === userId;
      const opponentId = isWhite
        ? pendingGame.player_black_id
        : pendingGame.player_white_id;
      const opponent = await User.findById(opponentId);

      return res.status(200).json({
        message: "Match Found!",
        gameId: pendingGame.id,
        opponent: {
          id: opponent.id,
          username: opponent.username,
          display_name: opponent.display_name,
        },
        color: isWhite ? "white" : "black",
      });
    } else if (matchmakingQueue.has(userId)) {
      // 3. Nếu không có Game nào được tạo và vẫn còn trong hàng đợi
      return res.status(202).json({ message: "Đang tìm trận đấu..." });
    } else {
      // 4. Nếu không có Game nào và không còn trong hàng đợi (đã thoát/hết phiên)
      return res
        .status(404)
        .json({ message: "Không tìm thấy yêu cầu tìm trận đấu" });
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const leaveMatchmaking = (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  // Xóa khỏi hàng đợi trong bộ nhớ
  const removed = matchmakingQueue.delete(userId);

  if (removed) {
    console.log(`User ${userId} left queue. Size: ${matchmakingQueue.size}`);
    return res.sendStatus(204); // Xóa thành công, không nội dung
  } else {
    return res
      .status(404)
      .json({ message: "Người dùng không có trong hàng đợi" });
  }
};
