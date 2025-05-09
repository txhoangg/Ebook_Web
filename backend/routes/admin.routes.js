const express = require("express");
const router = express.Router();
const admin = require("../controllers/admin.controller");
const { authJwt } = require("../middlewares");

module.exports = (app) => {
  // Middleware kiểm tra xác thực và quyền admin
  router.use([authJwt.verifyToken, authJwt.isAdmin]);

  // Lấy thống kê tổng quan
  router.get("/stats", admin.getStats);

  // Lấy sách mới nhất
  router.get("/books/latest", admin.getLatestBooks);

  // Lấy người dùng mới nhất
  router.get("/users/latest", admin.getLatestUsers);

  // Lấy tất cả sách
  router.get("/books", admin.getAllBooks);

  // Lấy tất cả người dùng
  router.get("/users", admin.getAllUsers);

  // Cập nhật trạng thái sách
  router.put("/books/:id/status", admin.updateBookStatus);

  // Cập nhật vai trò người dùng
  router.put("/users/:id/role", admin.updateUserRole);
  
  // Cập nhật trạng thái xác thực người dùng
  router.put("/users/:id/verify", admin.updateUserVerification);
  
  // Lấy chi tiết người dùng
  router.get("/users/:id", admin.getUserDetails);
  
  // Xóa người dùng
  router.delete("/users/:id", admin.deleteUser);

  // Đăng ký route
  app.use("/api/admin", router);
};
