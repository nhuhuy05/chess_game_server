import db from "../config/db.js";

export default class User {
  // Lấy toàn bộ user
  static async findAll() {
    const [rows] = await db.promise().query("SELECT * FROM users");
    return rows;
  }

  // Tìm user theo id
  static async findById(id) {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  }

  // Tìm user theo username (phục vụ đăng nhập)
  static async findByUsername(username) {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
    return rows[0];
  }

    // Tìm user theo email(check trùng email)
  static async findByEmail(email) {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  }

  // Tạo tài khoản mới
  static async create({ username, password, display_name, email, phone, avatar }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO users (username, password, display_name, email, phone, avatar) VALUES (?, ?, ?, ?, ?, ?)",
        [username, password, display_name, email, phone, avatar]
      );
    return { id: result.insertId, username, display_name, email, phone, avatar };
  }

  // Cập nhật thông tin người dùng
  static async update(id, { display_name, email, phone, avatar }) {
    await db
      .promise()
      .query(
        "UPDATE users SET display_name=?, email=?, phone=?, avatar=? WHERE id=?",
        [display_name, email, phone, avatar, id]
      );
    return this.findById(id);
  }

  // Cập nhật mật khẩu (dùng khi đổi pass hoặc reset)
  static async updatePassword(id, hashedPassword) {
    await db.promise().query("UPDATE users SET password=? WHERE id=?", [hashedPassword, id]);
    return { message: "Password updated successfully" };
  }

  // Xóa user
  static async delete(id) {
    await db.promise().query("DELETE FROM users WHERE id=?", [id]);
    return { message: "User deleted successfully" };
  }
}
