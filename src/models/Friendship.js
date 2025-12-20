import db from "../config/db.js";

export default class Friendship {
  static async sendRequest(requester_id, addressee_id) {
    // Kiểm tra xem đã có friendship nào giữa hai người này chưa (cả hai chiều)
    const [exists] = await db
      .promise()
      .query(
        `SELECT * FROM friendships 
         WHERE (requester_id=? AND addressee_id=?)
            OR (requester_id=? AND addressee_id=?)`,
        [requester_id, addressee_id, addressee_id, requester_id]
      );
    
    // Nếu đã có record với status pending hoặc accepted, không cho phép gửi lại
    if (exists.length > 0) {
      const existing = exists[0];
      if (existing.status === 'pending' || existing.status === 'accepted') {
        return null;
      }
      // Nếu status là declined, xóa record cũ và tạo mới
      if (existing.status === 'declined') {
        await db.promise().query(
          `DELETE FROM friendships 
           WHERE (requester_id=? AND addressee_id=?)
              OR (requester_id=? AND addressee_id=?)`,
          [requester_id, addressee_id, addressee_id, requester_id]
        );
      }
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')",
        [requester_id, addressee_id]
      );
    return { id: result.insertId, requester_id, addressee_id, status: "pending" };
  }

  static async acceptRequest(requester_id, addressee_id) {
    const [result] = await db
      .promise()
      .query(
        "UPDATE friendships SET status='accepted' WHERE requester_id=? AND addressee_id=?",
        [requester_id, addressee_id]
      );
    return result.affectedRows > 0;
  }

  static async declineRequest(requester_id, addressee_id) {
    await db
      .promise()
      .query(
        "UPDATE friendships SET status='declined' WHERE requester_id=? AND addressee_id=?",
        [requester_id, addressee_id]
      );
  }

  static async getFriends(user_id) {
    const [rows] = await db.promise().query(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.status
       FROM friendships f
       JOIN users u
         ON (u.id = f.addressee_id AND f.requester_id = ?)
         OR (u.id = f.requester_id AND f.addressee_id = ?)
       WHERE f.status='accepted'`,
      [user_id, user_id]
    );
    return rows;
  }

  static async deleteFriendship(user_id, friend_id) {
    await db
      .promise()
      .query(
        `DELETE FROM friendships
         WHERE (requester_id=? AND addressee_id=?)
            OR (requester_id=? AND addressee_id=?)`,
        [user_id, friend_id, friend_id, user_id]
      );
  }

  static async getPendingRequests(addressee_id) {
    const [rows] = await db.promise().query(
      `SELECT f.id, f.requester_id, f.created_at,
              u.username, u.display_name, u.avatar
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id=? AND f.status='pending'
       ORDER BY f.created_at DESC`,
      [addressee_id]
    );
    return rows;
  }

  static async getFriendshipStatus(user_id, other_user_id) {
    const [rows] = await db.promise().query(
      `SELECT status, requester_id, addressee_id
       FROM friendships
       WHERE (requester_id=? AND addressee_id=?)
          OR (requester_id=? AND addressee_id=?)`,
      [user_id, other_user_id, other_user_id, user_id]
    );
    return rows[0] || null;
  }

  static async checkIfFriends(user_id, friend_id) {
    const [rows] = await db.promise().query(
      `SELECT 1 FROM friendships
       WHERE ((requester_id=? AND addressee_id=?)
          OR (requester_id=? AND addressee_id=?))
       AND status='accepted'`,
      [user_id, friend_id, friend_id, user_id]
    );
    return rows.length > 0;
  }
}
