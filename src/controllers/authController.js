import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Token from "../models/Token.js";

const ACCESS_TOKEN_TTL = "30m"; //thường dưới 15m
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

export const signUp = async (req, res) => {
  try {
    const { username, password, email, displayName } = req.body;

    if (!username || !password || !email || !displayName) {
      return res.status(401).json({ message: "Không thể thiếu thông tin " });
    }

    //Kiểm tra xem username đa tồn tại chưa
    const duplicateUsername = await User.findByUsername(username);
    const duplicateEmail = await User.findByEmail(email);
    if (duplicateUsername || duplicateEmail) {
      return res
        .status(409)
        .json({ message: "Username hoặc email đã tồn tại" });
    }

    //mã hóa password
    const hashedPassword = await bcrypt.hash(password, 10); //salt = 10

    // tạo user mới
    await User.create({
      username,
      password: hashedPassword,
      display_name: displayName,
      email,
      phone: null,
      avatar: null,
    });

    //return
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signUp: ", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signIn = async (req, res) => {
  try {
    //lấy inputs
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    //lấy hashedPassword để so sánh với password input
    const user = await User.findByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Username hoặc password ko đúng" });
    }

    //so sánh pass
    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "Username hoặc password ko đúng" });
    }

    //nếu khớp tạo access token JWT
    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    //tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");
    //tao session mới để lưu refresh token
    await Token.create({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });
    //trả refresh token về trong cookie (trường hợp web)
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   samsSite: "non",
    //   maxAge: REFRESH_TOKEN_TTL,
    // });

    //trả access token về res
    return res
      .status(200)
      .json({ massage: `User ${user.display_name} đã đăng nhập` , accessToken, refreshToken});
  } catch (error) {
    console.error("Lỗi khi gọi signIn: ", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
