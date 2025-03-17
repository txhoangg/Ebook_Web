const express = require("express");
const router = express.Router();
const books = require("../controllers/book.controller");
const { authJwt } = require("../middlewares");
const upload = require("../middlewares/upload");

module.exports = (app) => {
  // Lấy tất cả sách
  router.get("/", books.findAll);

  // Lấy sách đặc trưng (featured)
  router.get("/featured", books.findFeatured);

  // Lấy sách theo ID
  router.get("/:id", books.findOne);

  // Tạo sách mới (yêu cầu đăng nhập)
  router.post("/", [authJwt.verifyToken, upload.uploadFiles], books.create);

  // Cập nhật sách (yêu cầu đăng nhập + quyền)
  router.put("/:id", [authJwt.verifyToken, upload.uploadFiles], books.update);

  // Xóa sách (yêu cầu đăng nhập + quyền)
  router.delete("/:id", [authJwt.verifyToken], books.delete);

  // Tải xuống sách
  router.get("/:id/download", books.download);

  // Đánh giá sách (yêu cầu đăng nhập)
  router.post("/:id/rate", [authJwt.verifyToken], books.ratebook);

  // Lấy bình luận sách
  router.get("/:id/comments", books.getComments);

  app.use("/api/books", router);
};
