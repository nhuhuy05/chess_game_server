import db from "../config/db.js";

export default class Move {
  static async addMove({ game_id, move_number, move_text }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO moves (game_id, move_number, move_text) VALUES (?, ?, ?)",
        [game_id, move_number, move_text]
      );
    return { id: result.insertId, game_id, move_number, move_text };
  }

  static async getMovesByGame(game_id) {
    const [rows] = await db
      .promise()
      .query("SELECT move_number, move_text FROM moves WHERE game_id=? ORDER BY move_number ASC", [
        game_id,
      ]);
    return rows;
  }

  static async deleteMovesByGame(game_id) {
    await db.promise().query("DELETE FROM moves WHERE game_id=?", [game_id]);
  }
}
