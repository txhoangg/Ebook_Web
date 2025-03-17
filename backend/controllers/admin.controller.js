const db = require("../models");
const Book = db.book;
const User = db.user;
const Download = db.download;
const Rating = db.rating;
const Category = db.category;
const { Sequelize, Op } = db.Sequelize;
const logger = require("../utils/logger");

// Lấy thống kê tổng quan
exports.getStats = async (req, res) => {
  try {
    // Lấy tổng số sách
    const totalBooks = await Book.count();

    // Lấy tổng số người dùng
    const totalUsers = await User.count();

    // Lấy tổng lượt tải xuống từ tổng downloadCount trong bảng books
    const totalDownloadsResult = await Book.sum("downloadCount");
    const totalDownloads = totalDownloadsResult || 0;

    // Lấy rating trung bình
    const avgRatingResult = await Rating.findOne({
      attributes: [[Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"]],
    });

    const avgRating = avgRatingResult.dataValues.avgRating || 0;

    // Lấy số sách mới trong tháng này
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const booksThisMonth = await Book.count({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfMonth,
        },
      },
    });

    const booksLastMonth = await Book.count({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfLastMonth,
          [Op.lte]: lastDayOfLastMonth,
        },
      },
    });

    // Tính % tăng trưởng sách
    const booksGrowth =
      booksLastMonth > 0
        ? (((booksThisMonth - booksLastMonth) / booksLastMonth) * 100).toFixed(
            1
          )
        : 0;

    // Tương tự cho người dùng
    const usersThisMonth = await User.count({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfMonth,
        },
      },
    });

    const usersLastMonth = await User.count({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfLastMonth,
          [Op.lte]: lastDayOfLastMonth,
        },
      },
    });

    const usersGrowth =
      usersLastMonth > 0
        ? (((usersThisMonth - usersLastMonth) / usersLastMonth) * 100).toFixed(
            1
          )
        : 0;

    // Lấy tổng lượt tải cho tháng này và tháng trước
    const downloadsThisMonthResult = await Book.sum("downloadCount", {
      where: {
        createdAt: {
          [Op.gte]: firstDayOfMonth,
        },
      },
    });
    const downloadsThisMonth = downloadsThisMonthResult || 0;

    const downloadsLastMonthResult = await Book.sum("downloadCount", {
      where: {
        createdAt: {
          [Op.gte]: firstDayOfLastMonth,
          [Op.lte]: lastDayOfLastMonth,
        },
      },
    });
    const downloadsLastMonth = downloadsLastMonthResult || 0;

    const downloadsGrowth =
      downloadsLastMonth > 0
        ? (
            ((downloadsThisMonth - downloadsLastMonth) / downloadsLastMonth) *
            100
          ).toFixed(1)
        : 0;

    // Tính thay đổi rating trung bình
    const avgRatingLastMonth = await Rating.findOne({
      attributes: [[Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"]],
      where: {
        createdAt: {
          [Op.gte]: firstDayOfLastMonth,
          [Op.lte]: lastDayOfLastMonth,
        },
      },
    });

    const lastMonthRating = avgRatingLastMonth.dataValues.avgRating || 0;
    const ratingChange = (avgRating - lastMonthRating).toFixed(1);

    // Trả về kết quả
    res.send({
      totalBooks,
      totalUsers,
      totalDownloads,
      avgRating,
      booksGrowth,
      usersGrowth,
      downloadsGrowth,
      ratingChange,
    });
  } catch (err) {
    logger.error("Error getting admin stats:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy thống kê.",
    });
  }
};

// Lấy sách mới nhất
exports.getLatestBooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const books = await Book.findAll({
      // Thêm attributes để chỉ định chính xác các cột cần lấy
      attributes: [
        "id",
        "title",
        "author",
        "description",
        "coverPath",
        "filePath",
        "fileType",
        "fileSize",
        "pageCount",
        "language",
        "publishYear",
        "isbn",
        "rating",
        "downloadCount",
        "featured",
        "status",
        "uploaderId",
        "createdAt",
        "updatedAt",
        "categoryId",
      ],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
    });

    res.send(books);
  } catch (err) {
    logger.error("Error getting latest books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách sách mới nhất.",
    });
  }
};

// Lấy người dùng mới nhất
exports.getLatestUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
      limit,
    });

    res.send(users);
  } catch (err) {
    logger.error("Error getting latest users:", err);
    res.status(500).send({
      message:
        err.message || "Đã xảy ra lỗi khi lấy danh sách người dùng mới nhất.",
    });
  }
};

// Lấy tất cả sách
exports.getAllBooks = async (req, res) => {
  try {
    const { title, category, status, sort, page, limit } = req.query;
    let condition = {};
    let order = [["createdAt", "DESC"]];

    // Xử lý tìm kiếm theo tiêu đề
    if (title) {
      condition.title = { [Op.like]: `%${title}%` };
    }

    // Xử lý lọc theo danh mục
    if (category) {
      condition.categoryId = category;
    }

    // Xử lý lọc theo trạng thái
    if (status) {
      condition.status = status;
    }

    // Xử lý sắp xếp
    if (sort) {
      const [field, direction] = sort.split(":");
      order = [[field, direction === "desc" ? "DESC" : "ASC"]];
    }

    // Xử lý phân trang
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * pageSize;

    const { count, rows } = await Book.findAndCountAll({
      attributes: [
        "id",
        "title",
        "author",
        "description",
        "coverPath",
        "filePath",
        "fileType",
        "fileSize",
        "pageCount",
        "language",
        "publishYear",
        "isbn",
        "rating",
        "downloadCount",
        "featured",
        "status",
        "uploaderId",
        "createdAt",
        "updatedAt",
        "categoryId",
      ],
      where: condition,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username"],
        },
      ],
      order,
      limit: pageSize,
      offset,
    });

    res.send({
      totalItems: count,
      books: rows,
      totalPages: Math.ceil(count / pageSize),
      currentPage: pageNumber,
    });
  } catch (err) {
    logger.error("Error getting all books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách sách.",
    });
  }
};

// Lấy tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const { username, role, sort, page, limit } = req.query;
    let condition = {};
    let order = [["createdAt", "DESC"]];

    // Xử lý tìm kiếm theo username
    if (username) {
      condition.username = { [Op.like]: `%${username}%` };
    }

    // Xử lý lọc theo vai trò
    if (role) {
      condition.role = role;
    }

    // Xử lý sắp xếp
    if (sort) {
      const [field, direction] = sort.split(":");
      order = [[field, direction === "desc" ? "DESC" : "ASC"]];
    }

    // Xử lý phân trang
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * pageSize;

    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ["password"] },
      where: condition,
      order,
      limit: pageSize,
      offset,
    });

    res.send({
      totalItems: count,
      users: rows,
      totalPages: Math.ceil(count / pageSize),
      currentPage: pageNumber,
    });
  } catch (err) {
    logger.error("Error getting all users:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách người dùng.",
    });
  }
};

// Cập nhật trạng thái sách
exports.updateBookStatus = async (req, res) => {
  try {
    const bookId = req.params.id;
    const { status, featured } = req.body;
    const updateData = {};

    // Kiểm tra và thêm trạng thái nếu có
    if (status) {
      // Kiểm tra trạng thái hợp lệ
      const validStatuses = ["active", "inactive", "pending"];
      if (!validStatuses.includes(status)) {
        return res.status(400).send({
          message:
            "Trạng thái không hợp lệ! Các trạng thái hợp lệ: active, inactive, pending",
        });
      }
      updateData.status = status;
    }

    // Kiểm tra và thêm featured nếu có
    if (featured !== undefined) {
      updateData.featured = featured;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({
        message: "Không có dữ liệu để cập nhật!",
      });
    }

    // Cập nhật trạng thái
    const result = await Book.update(updateData, { where: { id: bookId } });

    if (result[0] === 1) {
      res.send({
        message: "Thông tin sách đã được cập nhật thành công!",
      });
    } else {
      res.status(404).send({
        message: `Không thể cập nhật sách với id=${bookId}. Sách không tồn tại!`,
      });
    }
  } catch (err) {
    logger.error("Error updating book status:", err);
    res.status(500).send({
      message:
        err.message ||
        `Đã xảy ra lỗi khi cập nhật thông tin sách với id=${req.params.id}.`,
    });
  }
};

// Cập nhật vai trò người dùng
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Kiểm tra vai trò hợp lệ
    const validRoles = ["user", "admin", "moderator"];
    if (!validRoles.includes(role)) {
      return res.status(400).send({
        message:
          "Vai trò không hợp lệ! Các vai trò hợp lệ: user, admin, moderator",
      });
    }

    // Kiểm tra không tự thay đổi vai trò của chính mình
    if (userId == req.userId) {
      return res.status(400).send({
        message: "Không thể thay đổi vai trò của chính bạn!",
      });
    }

    // Cập nhật vai trò
    const result = await User.update({ role }, { where: { id: userId } });

    if (result[0] === 1) {
      res.send({
        message: "Vai trò người dùng đã được cập nhật thành công!",
      });
    } else {
      res.status(404).send({
        message: `Không thể cập nhật vai trò người dùng với id=${userId}. Người dùng không tồn tại!`,
      });
    }
  } catch (err) {
    logger.error("Error updating user role:", err);
    res.status(500).send({
      message:
        err.message ||
        `Đã xảy ra lỗi khi cập nhật vai trò người dùng với id=${req.params.id}.`,
    });
  }
};
