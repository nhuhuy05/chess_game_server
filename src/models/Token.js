import db from "../config/db.js";

export default class Token {
  static async create({ user_id, refresh_token, expires_at }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?)",
        [user_id, refresh_token, expires_at]
      );
    return { id: result.insertId, user_id, refresh_token, expires_at };
  }

  static async findByToken(refresh_token) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM tokens WHERE refresh_token = ?", [refresh_token]);
    return rows[0];
  }

  static async delete(refresh_token) {
    await db
      .promise()
      .query("DELETE FROM tokens WHERE refresh_token = ?", [refresh_token]);
  }

  static async deleteByUser(user_id) {
    await db.promise().query("DELETE FROM tokens WHERE user_id = ?", [user_id]);
  }
}
