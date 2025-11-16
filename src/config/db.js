import mysql from "mysql2";

const connectDB = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "chess_db",
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
