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

    const duplicateUsername = await User.findByUsername(username);
    const duplicateEmail = await User.findByEmail(email);
    if (duplicateUsername || duplicateEmail) {
      return res.status(409).json({ message: "Username hoặc email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); //salt = 10

    await User.create({
      username,
      password: hashedPassword,
      display_name: displayName,
      email,
      phone: null,
      avatar: null,
      role: "user",
      status: "offline",
      is_active: true,
    });

    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signUp: ", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: "Username hoặc password ko đúng" });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Username hoặc password ko đúng" });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    await Token.create({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    await User.updateStatus(user.id, "online");

    return res.status(200).json({
      massage: `User ${user.display_name} đã đăng nhập`,
      accessToken,
      refreshToken,
      userId: user.id,
      displayName: user.display_name,
      role: user.role,
    });
  } catch (error) {
    console.error("Lỗi khi gọi signIn: ", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signOut = async (req, res) => {
  try {
    const token =
      req.body?.refreshToken ||
      req.cookies?.refreshToken ||
      req.refreshToken;

    if (!token) {
      return res.status(400).json({ message: "Thiếu refreshToken" });
    }

    const storedToken = await Token.findByToken(token);

    if (storedToken) {
      await Token.delete(token);
      await User.updateStatus(storedToken.user_id, "offline");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signOut: ", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
