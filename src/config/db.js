import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const connectDB = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: 0,
});

connectDB.getConnection((err, connection) => {
  if (err) {
    console.error("Lỗi kết nối MySQL:", err.message);
  } else {
    console.log("Đã kết nối tới MySQL database");
    connection.release();
  }
});

export default connectDB;
