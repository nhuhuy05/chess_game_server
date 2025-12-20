import db from "../config/db.js";

const VALID_GAME_MODES = new Set(["friend", "random", "bot"]);

export default class Game {
  static normalizeMode(mode) {
    if (mode && VALID_GAME_MODES.has(mode)) {
      return mode;
    }
    return "random";
  }

  static async create({ player_white_id, player_black_id = null, mode = "random" }) {
    const normalizedMode = this.normalizeMode(mode);
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO games (player_white_id, player_black_id, mode, status) VALUES (?, ?, ?, 'waiting')",
        [player_white_id, player_black_id, normalizedMode]
      );
    return {
      id: result.insertId,
      player_white_id,
      player_black_id,
      mode: normalizedMode,
      status: "waiting",
    };
  }

  static async updateStatus(id, status) {
    await db.promise().query("UPDATE games SET status=? WHERE id=?", [status, id]);
  }

  static async setWinner(id, winner_id) {
    await db
      .promise()
      .query("UPDATE games SET status='finished', winner_id=?, ended_at=NOW() WHERE id=?", [
        winner_id,
        id,
      ]);
  }

  static async findAll() {
    const [rows] = await db.promise().query("SELECT * FROM games");
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.promise().query("SELECT * FROM games WHERE id=?", [id]);
    return rows[0];
  }

  static async getOngoingGames() {
    const [rows] = await db.promise().query("SELECT * FROM games WHERE status='playing'");
    return rows;
  }

  static async delete(id) {
    await db.promise().query("DELETE FROM games WHERE id=?", [id]);
  }

  static async findPendingGameForUser(userId) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM games WHERE status='waiting' AND (player_white_id=? OR player_black_id=?) ORDER BY id DESC LIMIT 1",
        [userId, userId]
      );
    return rows[0];
  }
}
