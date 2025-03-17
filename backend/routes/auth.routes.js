const express = require("express");
const router = express.Router();
const { authJwt } = require("../middlewares");
const authController = require("../controllers/auth.controller");

module.exports = (app) => {
  // Middleware để thiết lập headers
  router.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Đăng ký tài khoản
  router.post("/signup", authController.signup);

  // Đăng nhập
  router.post("/signin", authController.signin);

  // Kiểm tra token
  router.get("/checkToken", [authJwt.verifyToken], (req, res) => {
    res.status(200).send({ message: "Token hợp lệ!" });
  });

  // Đăng ký route với app
  app.use("/api/auth", router);
};
