import db from "../config/db.js";

export default class Game {
  static async create({ player_white_id, player_black_id, mode }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO games (player_white_id, player_black_id, mode, status) VALUES (?, ?, ?, 'waiting')",
        [player_white_id, player_black_id, mode]
      );
    return { id: result.insertId, player_white_id, player_black_id, mode, status: "waiting" };
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
}
