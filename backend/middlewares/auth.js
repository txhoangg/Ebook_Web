const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const logger = require("../utils/logger");

// Xác thực token
verifyToken = (req, res, next) => {
  // Lấy token từ header
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  // Kiểm tra token có tồn tại không
  if (!token) {
    return res.status(403).send({
      message: "Không tìm thấy token!",
    });
  }

  // Nếu token bắt đầu bằng "Bearer "
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  // Xác thực token
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      logger.error("Error verifying JWT token:", err);
      return res.status(401).send({
        message: "Không có quyền truy cập!",
      });
    }

    // Lưu thông tin user vào request
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// Kiểm tra vai trò Admin
isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).send({
        message: "Không tìm thấy người dùng!",
      });
    }

    if (user.role === "admin") {
      next();
      return;
    }

    res.status(403).send({
      message: "Yêu cầu vai trò Admin!",
    });
  } catch (err) {
    logger.error("Error checking admin role:", err);
    res.status(500).send({
      message: "Lỗi khi kiểm tra vai trò Admin!",
    });
  }
};

// Kiểm tra tài khoản đã xác minh
isVerified = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).send({
        message: "Không tìm thấy người dùng!",
      });
    }

    if (user.verified) {
      next();
      return;
    }

    res.status(403).send({
      message: "Tài khoản chưa được xác minh!",
    });
  } catch (err) {
    logger.error("Error checking user verification:", err);
    res.status(500).send({
      message: "Lỗi khi kiểm tra xác minh tài khoản!",
    });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isVerified,
};

module.exports = authJwt;
