const express = require("express");
const router = express.Router();
const users = require("../controllers/user.controller");
const { authJwt } = require("../middlewares");

module.exports = (app) => {
  // Middleware kiểm tra xác thực
  router.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Lấy thông tin cá nhân
  router.get("/profile", [authJwt.verifyToken], users.getProfile);

  // Cập nhật thông tin cá nhân
  router.put("/profile", [authJwt.verifyToken], users.updateProfile);

  // Lấy danh sách sách đã upload
  router.get("/books", [authJwt.verifyToken], users.getMyBooks);

  // Lấy danh sách sách yêu thích
  router.get("/favorites", [authJwt.verifyToken], users.getFavoriteBooks);

  // Thêm sách vào yêu thích
  router.post(
    "/favorites/:bookId",
    [authJwt.verifyToken],
    users.addToFavorites
  );

  // Xóa sách khỏi yêu thích
  router.delete(
    "/favorites/:bookId",
    [authJwt.verifyToken],
    users.removeFromFavorites
  );

  // Lấy lịch sử tải xuống
  router.get("/downloads", [authJwt.verifyToken], users.getDownloadHistory);

  // Đăng ký route
  app.use("/api/users", router);
};
