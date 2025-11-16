import db from "../config/db.js";

export default class Notification {
  static async create({ sender_id, receiver_id, title, content }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO notifications (sender_id, receiver_id, title, content) VALUES (?, ?, ?, ?)",
        [sender_id, receiver_id, title, content]
      );
    return { id: result.insertId, sender_id, receiver_id, title, content };
  }

  static async getByUser(receiver_id) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, title, content, created_at FROM notifications WHERE receiver_id=? ORDER BY created_at DESC",
        [receiver_id]
      );
    return rows;
  }

  static async getAll() {
    const [rows] = await db.promise().query(
      "SELECT n.*, u.username AS sender FROM notifications n LEFT JOIN users u ON n.sender_id = u.id ORDER BY n.created_at DESC"
    );
    return rows;
  }

  static async delete(id) {
    await db.promise().query("DELETE FROM notifications WHERE id=?", [id]);
  }
}
