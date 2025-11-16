import db from "../config/db.js";

export default class Ranking {
  static async findByUserId(user_id) {
    const [rows] = await db.promise().query("SELECT * FROM rankings WHERE user_id=?", [user_id]);
    return rows[0];
  }

  static async create(user_id) {
    const [result] = await db
      .promise()
      .query("INSERT INTO rankings (user_id, games_played, wins, losses, draws, score) VALUES (?, 0, 0, 0, 0, 0)", [user_id]);
    return { id: result.insertId, user_id };
  }

  static async updateAfterGame(user_id, result) {
    let query;
    switch (result) {
      case "win":
        query = "UPDATE rankings SET games_played=games_played+1, wins=wins+1, score=score+3 WHERE user_id=?";
        break;
      case "draw":
        query = "UPDATE rankings SET games_played=games_played+1, draws=draws+1, score=score+1 WHERE user_id=?";
        break;
      case "loss":
        query = "UPDATE rankings SET games_played=games_played+1, losses=losses+1 WHERE user_id=?";
        break;
    }
    await db.promise().query(query, [user_id]);
  }

  static async getTopPlayers(limit = 10) {
    const [rows] = await db
      .promise()
      .query(
        `SELECT u.id, u.username, u.display_name, r.score, r.wins, r.losses, r.draws
         FROM rankings r
         JOIN users u ON r.user_id = u.id
         ORDER BY r.score DESC
         LIMIT ?`,
        [limit]
      );
    return rows;
  }
}
