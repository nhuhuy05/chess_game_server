import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = (req, res, next) => {
  try {
    //lấy token từ header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy acessToken" });
    }
    // xác nhận token hợp lệ
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.error(err);
          return res
            .status(403)
            .json({ massage: "accessToken hết hạn hoặc ko đúng" });
        }
        //tìm user
        const user = await User.findById(decodedUser.userId);
        if (!user) {
          return res.status(404).json({ message: "người dùng ko tồn tại" });
        }
        // trả về user trong req
        req.user = user;
        next();
      }
    );
  } catch (error) {
    console.log("Lỗi khi xác minh JWT trong authMiddleware");
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
