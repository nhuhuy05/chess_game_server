// Middleware để kiểm tra quyền admin
export const adminOnly = (req, res, next) => {
  try {
    // req.user đã được set bởi protectedRoute middleware
    if (!req.user) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Không có quyền truy cập. Chỉ dành cho quản trị viên." 
      });
    }

    next();
  } catch (error) {
    console.error("Lỗi trong adminMiddleware:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};







