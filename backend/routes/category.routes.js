const express = require("express");
const router = express.Router();
const categories = require("../controllers/category.controller");
const { authJwt } = require("../middlewares");

module.exports = (app) => {
  // Lấy tất cả danh mục
  router.get("/", categories.findAll);

  // Lấy danh mục theo ID
  router.get("/:id", categories.findOne);

  // Tạo danh mục mới (yêu cầu admin)
  router.post("/", [authJwt.verifyToken, authJwt.isAdmin], categories.create);

  // Cập nhật danh mục (yêu cầu admin)
  router.put("/:id", [authJwt.verifyToken, authJwt.isAdmin], categories.update);

  // Xóa danh mục (yêu cầu admin)
  router.delete(
    "/:id",
    [authJwt.verifyToken, authJwt.isAdmin],
    categories.delete
  );

  // Đăng ký route với app
  app.use("/api/categories", router);
};
