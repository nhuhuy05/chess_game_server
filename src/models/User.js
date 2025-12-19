import db from "../config/db.js";

const MUTABLE_COLUMNS = [
  "display_name",
  "email",
  "phone",
  "avatar",
  "role",
  "status",
  "is_active",
  "password",
];

export default class User {
  static async findAll() {
    const [rows] = await db.promise().query("SELECT * FROM users");
    return rows;
  }

  static async findById(id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM users WHERE username = ?", [username]);
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  }

  static async create({
    username,
    password,
    display_name,
    email,
    phone = null,
    avatar = null,
    role = "user",
    status = "offline",
    is_active = true,
  }) {
    const [result] = await db.promise().query(
      `INSERT INTO users
        (username, password, display_name, email, phone, avatar, role, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        password,
        display_name,
        email,
        phone,
        avatar,
        role,
        status,
        is_active,
      ]
    );
    return this.findById(result.insertId);
  }

  static async update(id, fields = {}) {
    const entries = Object.entries(fields).filter(
      ([column, value]) =>
        MUTABLE_COLUMNS.includes(column) && value !== undefined
    );

    if (entries.length === 0) {
      return this.findById(id);
    }

    const assignments = entries.map(([column]) => `${column}=?`).join(", ");
    const values = entries.map(([, value]) => value);
    values.push(id);

    await db
      .promise()
      .query(`UPDATE users SET ${assignments} WHERE id=?`, values);
    return this.findById(id);
  }

  static async updatePassword(id, hashedPassword) {
    await this.update(id, { password: hashedPassword });
    return { message: "Password updated successfully" };
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async updateActiveState(id, is_active) {
    return this.update(id, { is_active });
  }

  static async delete(id) {
    await db.promise().query("DELETE FROM users WHERE id=?", [id]);
    return { message: "User deleted successfully" };
  }

  static async searchByUsernameOrDisplayName(searchTerm, excludeUserId = null) {
    const searchPattern = `%${searchTerm}%`;
    let query = `SELECT id, username, display_name, avatar, status 
                 FROM users 
                 WHERE (username LIKE ? OR display_name LIKE ?) 
                 AND id != COALESCE(?, -1) 
                 AND is_active = TRUE
                 LIMIT 20`;
    const params = excludeUserId 
      ? [searchPattern, searchPattern, excludeUserId]
      : [searchPattern, searchPattern, null];
    
    const [rows] = await db.promise().query(query, params);
    return rows;
  }
}
