const db = require("../models");
const User = db.user;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config/auth.config");
const logger = require("../utils/logger");

// Đăng ký tài khoản
exports.signup = async (req, res) => {
  try {
    // Tạo người dùng mới
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
      displayName: req.body.displayName || req.body.username,
    });

    res.send({ message: "Đăng ký tài khoản thành công!" });
  } catch (err) {
    logger.error("Error in signup:", err);
    res
      .status(500)
      .send({ message: err.message || "Đã xảy ra lỗi khi đăng ký tài khoản." });
  }
};

// Đăng nhập
exports.signin = async (req, res) => {
  try {
    // Tìm người dùng
    const user = await User.findOne({
      where: {
        username: req.body.username,
      },
    });

    if (!user) {
      return res.status(404).send({ message: "Không tìm thấy người dùng!" });
    }

    // Kiểm tra mật khẩu
    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Mật khẩu không đúng!",
      });
    }

    // Tạo token
    const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
      expiresIn: config.jwtExpiration,
    });

    // Trả về thông tin
    res.status(200).send({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt,
      accessToken: token,
    });
  } catch (err) {
    logger.error("Error in signin:", err);
    res
      .status(500)
      .send({ message: err.message || "Đã xảy ra lỗi khi đăng nhập." });
  }
};
