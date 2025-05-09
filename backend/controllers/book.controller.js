const db = require("../models");
const Book = db.book;
const Category = db.category;
const User = db.user;
const fsPromises = require("fs").promises;
const fs = require("fs"); // Giữ lại fs thông thường cho các hàm đồng bộ
const path = require("path");
const logger = require("../utils/logger");
const pathUtils = require("../utils/path.utils");
const { handleApiError } = require("../utils/error-handler");
const validator = require("../utils/validator");

// Tạo sách mới
exports.create = async (req, res) => {
  try {
    // Validate request - Chỉ kiểm tra thông tin cơ bản
    if (!req.body.title || !req.body.author) {
      return res.status(400).send({
        message: "Thiếu thông tin bắt buộc: tiêu đề và tác giả",
      });
    }

    // Kiểm tra file sách
    if (!req.file) {
      return res.status(400).send({
        message: "Vui lòng tải lên file sách",
      });
    }

    // Lưu thông tin sách
    const book = {
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      filePath: req.file.path, // Đường dẫn tương đối
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      coverPath: req.body.coverPath || null, // Đã được set ở middleware
      pageCount: req.body.pageCount,
      language: req.body.language,
      publishYear: req.body.publishYear,
      isbn: req.body.isbn,
      categoryId: req.body.categoryId,
      uploaderId: req.userId,
    };

    // Log để debug
    logger.info(
      "Creating book with data:",
      JSON.stringify({
        title: book.title,
        filePath: book.filePath,
        coverPath: book.coverPath,
      })
    );

    // Lưu vào database
    const data = await Book.create(book);
    res.status(201).send(data);
  } catch (err) {
    logger.error("Error creating book:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi tạo sách mới.",
    });
  }
};

// Lấy tất cả sách
exports.findAll = async (req, res) => {
  try {
    const { title, category, featured, sort } = req.query;
    let condition = {};
    let order = [];

    // Xử lý tìm kiếm theo tiêu đề
    if (title) {
      condition.title = { [db.Sequelize.Op.like]: `%${title}%` };
    }

    // Xử lý lọc theo danh mục
    if (category) {
      condition.categoryId = category;
    }

    // Xử lý lọc theo featured
    if (featured === "true") {
      condition.featured = true;
    }

    // Xử lý sắp xếp
    if (sort) {
      const [field, direction] = sort.split(":");
      order.push([field, direction === "desc" ? "DESC" : "ASC"]);
    } else {
      order.push(["createdAt", "DESC"]); // Mặc định sắp xếp theo ngày tạo
    }

    const data = await Book.findAll({
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
      order: order,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    res.send(data);
  } catch (err) {
    logger.error("Error fetching books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách sách.",
    });
  }
};

// Lấy sách đặc trưng (featured)
exports.findFeatured = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const data = await Book.findAll({
      where: { featured: true },
      limit: limit,
      order: [["createdAt", "DESC"]],
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
      ],
    });

    res.send(data);
  } catch (err) {
    logger.error("Error fetching featured books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy sách nổi bật.",
    });
  }
};

// Lấy thông tin một sách theo ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await Book.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username"],
        },
      ],
      // Thêm danh sách cụ thể các trường muốn lấy
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
        "ratingCount",
        "downloadCount",
        "viewCount",
        "featured",
        "status",
        "uploaderId",
        "categoryId",
        "createdAt",
        "updatedAt",
      ],
    });

    if (data) {
      // Tăng lượt xem
      await data.update({
        viewCount: (data.viewCount || 0) + 1,
      });

      res.send(data);
    } else {
      res.status(404).send({
        message: `Không tìm thấy sách với id=${id}.`,
      });
    }
  } catch (err) {
    logger.error(`Error fetching book with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi lấy thông tin sách id=${req.params.id}`,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const book = await Book.findByPk(id);

    if (!book) {
      return res.status(404).send({
        message: `Không tìm thấy sách với id=${id}.`,
      });
    }

    // Kiểm tra quyền (chỉ admin hoặc người tạo mới được cập nhật)
    if (book.uploaderId !== req.userId && req.userRole !== "admin") {
      return res.status(403).send({
        message: "Bạn không có quyền cập nhật sách này!",
      });
    }

    // Tạo object chứa dữ liệu cập nhật
    const updateData = {};

    // Cập nhật các trường thông thường
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.author) updateData.author = req.body.author;
    if (req.body.description !== undefined)
      updateData.description = req.body.description;
    if (req.body.pageCount) updateData.pageCount = req.body.pageCount;
    if (req.body.language) updateData.language = req.body.language;
    if (req.body.publishYear) updateData.publishYear = req.body.publishYear;
    if (req.body.isbn) updateData.isbn = req.body.isbn;
    if (req.body.categoryId) updateData.categoryId = req.body.categoryId;

    // Cập nhật file sách nếu có
    if (req.file) {
      updateData.filePath = req.file.path;
      updateData.fileType = req.file.mimetype;
      updateData.fileSize = req.file.size;

      // Xóa file cũ nếu tồn tại
      if (book.filePath && fs.existsSync(book.filePath)) {
        fs.unlinkSync(book.filePath);
      }
    }

    // Cập nhật ảnh bìa nếu có
    if (req.body.coverPath) {
      updateData.coverPath = req.body.coverPath;

      // Xóa ảnh bìa cũ nếu tồn tại và khác với đường dẫn mới
      if (
        book.coverPath &&
        book.coverPath !== req.body.coverPath &&
        fs.existsSync(book.coverPath)
      ) {
        fs.unlinkSync(book.coverPath);
      }
    }

    // Log để debug
    logger.info(
      `Updating book ${id} with:`,
      JSON.stringify({
        ...updateData,
        coverPath: updateData.coverPath || "not changed",
      })
    );

    const result = await Book.update(updateData, {
      where: { id: id },
    });

    if (result[0] === 1) {
      res.send({
        message: "Cập nhật thông tin sách thành công.",
      });
    } else {
      res.send({
        message: `Không thể cập nhật sách với id=${id}.`,
      });
    }
  } catch (err) {
    logger.error(`Error updating book with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi cập nhật thông tin sách id=${req.params.id}`,
    });
  }
};

// Xóa sách - Cách tiếp cận trực tiếp với database
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    logger.info(`Attempting to delete book with ID: ${id}`);

    // Tìm sách trước khi xóa để lấy thông tin file
    const book = await db.sequelize.query("SELECT * FROM books WHERE id = ?", {
      replacements: [id],
      type: db.sequelize.QueryTypes.SELECT,
    });

    if (!book || book.length === 0) {
      logger.warn(`Book with ID ${id} not found for deletion`);
      return res.status(404).send({
        message: `Không tìm thấy sách với id=${id}.`,
      });
    }

    const bookData = book[0];

    // Kiểm tra quyền (chỉ admin hoặc người tạo mới được xóa)
    if (bookData.uploaderId !== req.userId && req.userRole !== "admin") {
      logger.warn(
        `User ${req.userId} tried to delete book ${id} without permission`
      );
      return res.status(403).send({
        message: "Bạn không có quyền xóa sách này!",
      });
    }

    // Lưu đường dẫn file để xóa sau
    const filePath = bookData.filePath;
    const coverPath = bookData.coverPath;

    logger.info(`File paths to be deleted: ${filePath}, ${coverPath}`);

    // Xóa các đánh giá liên quan đến sách
    await db.sequelize.query("DELETE FROM ratings WHERE bookId = ?", {
      replacements: [id],
      type: db.sequelize.QueryTypes.DELETE,
    });

    // Xóa lịch sử tải xuống
    await db.sequelize.query("DELETE FROM downloads WHERE bookId = ?", {
      replacements: [id],
      type: db.sequelize.QueryTypes.DELETE,
    });

    // Xóa user_favorites
    await db.sequelize.query("DELETE FROM user_favorites WHERE bookId = ?", {
      replacements: [id],
      type: db.sequelize.QueryTypes.DELETE,
    });

    // Xóa sách
    const [_, affectedRows] = await db.sequelize.query(
      "DELETE FROM books WHERE id = ?",
      {
        replacements: [id],
        type: db.sequelize.QueryTypes.DELETE,
      }
    );

    logger.info(`Delete result: Affected rows = ${affectedRows}`);

    if (affectedRows > 0) {
      // Xóa file vật lý
      try {
        if (filePath) {
          const absoluteFilePath = pathUtils.getAbsolutePath(filePath);
          
          logger.info(`Attempting to delete file: ${absoluteFilePath}`);
          
          try {
            await fsPromises.access(absoluteFilePath);
            await fsPromises.unlink(absoluteFilePath);
            logger.info(`Deleted file: ${absoluteFilePath}`);
          } catch (accessErr) {
            logger.warn(`File not found or cannot be accessed: ${absoluteFilePath}, Error: ${accessErr.message}`);
          }
        }
        
        if (coverPath) {
          const absoluteCoverPath = pathUtils.getAbsolutePath(coverPath);
          
          logger.info(`Attempting to delete cover: ${absoluteCoverPath}`);
          
          try {
            await fsPromises.access(absoluteCoverPath);
            await fsPromises.unlink(absoluteCoverPath);
            logger.info(`Deleted cover: ${absoluteCoverPath}`);
          } catch (accessErr) {
            logger.warn(`Cover not found or cannot be accessed: ${absoluteCoverPath}, Error: ${accessErr.message}`);
          }
        }
      } catch (fileError) {
        logger.error(`Error during file deletion process: ${fileError}`);
        // Không trả về lỗi vì bản ghi đã được xóa
      }

      res.send({
        message: "Xóa sách thành công!",
      });
    } else {
      logger.warn(`No records deleted for book ID ${id}`);
      res.status(404).send({
        message: `Không thể xóa sách với id=${id}. Sách có thể đã bị xóa trước đó.`,
      });
    }
  } catch (err) {
    logger.error(`Error deleting book with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi xóa sách id=${req.params.id}: ${err.message}`,
    });
  }
};
exports.download = async (req, res) => {
  try {
    const id = req.params.id;
    logger.info(`Attempting to download book with ID: ${id}`);

    const book = await Book.findByPk(id);

    if (!book) {
      return res.status(404).send({
        message: `Không tìm thấy sách với id=${id}.`,
      });
    }

    const filePath = book.filePath;
    logger.info(`File path from database: ${filePath}`);

    // Xử lý đường dẫn tương đối/tuyệt đối
    const absoluteFilePath = pathUtils.getAbsolutePath(filePath);

    // Tăng lượt tải
    await book.update({
      downloadCount: book.downloadCount + 1,
    });

    // Xác định userId từ token trong query string
    let userId = null;
    const tokenFromQuery = req.query.token;

    if (tokenFromQuery) {
      try {
        // Lấy JWT_SECRET từ biến môi trường hoặc config
        const JWT_SECRET =
          process.env.JWT_SECRET || require("../config/auth.config.js").secret;

        // Giải mã token
        const decoded = require("jsonwebtoken").verify(
          tokenFromQuery,
          JWT_SECRET
        );
        userId = decoded.id;
        logger.info(`Authenticated user from query token: ${userId}`);
      } catch (tokenErr) {
        logger.error(`Token verification error: ${tokenErr.message}`);
      }
    } else if (req.userId) {
      // Nếu đã được xác thực qua middleware
      userId = req.userId;
      logger.info(`User from middleware: ${userId}`);
    }

    // Ghi lại lịch sử tải xuống nếu có userId
    if (userId) {
      try {
        logger.info(
          `Recording download history for user ${userId}, book ${id}`
        );

        // Sử dụng SQL thuần
        await db.sequelize.query(
          "INSERT INTO downloads (userId, bookId, downloadedAt, ipAddress, userAgent) VALUES (?, ?, NOW(), ?, ?)",
          {
            replacements: [
              userId,
              id,
              req.ip || "127.0.0.1",
              req.headers["user-agent"] || "Unknown",
            ],
            type: db.sequelize.QueryTypes.INSERT,
          }
        );

        logger.info("Download history recorded successfully");
      } catch (err) {
        logger.error(`Error recording download: ${err.message}`);
      }
    } else {
      logger.warn("No user ID available to record download history");
    }

    // Kiểm tra file tồn tại
    try {
      await fsPromises.access(absoluteFilePath, fs.constants.F_OK);
      
      // Gửi file
      res.download(absoluteFilePath, path.basename(absoluteFilePath), (err) => {
        if (err) {
          logger.error(`Error downloading book with id=${id}:`, err);
          res.status(500).send({
            message: "Lỗi khi tải xuống sách.",
          });
        }
      });
    } catch (fileErr) {
      logger.error(`File does not exist at path: ${absoluteFilePath}, Error: ${fileErr.message}`);
      return res.status(404).send({
        message: "File sách không tồn tại!",
      });
    }
  } catch (err) {
    logger.error(`Error downloading book with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi tải xuống sách id=${req.params.id}`,
    });
  }
};
// Đánh giá sách
exports.ratebook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.userId;
    const { rating, comment } = req.body;

    // Kiểm tra sách tồn tại
    const book = await Book.findByPk(bookId);

    if (!book) {
      return res.status(404).send({
        message: "Không tìm thấy sách!",
      });
    }

    // Kiểm tra người dùng đã đánh giá sách này chưa
    const existingRating = await db.rating.findOne({
      where: {
        userId: userId,
        bookId: bookId,
      },
    });

    if (existingRating) {
      // Cập nhật đánh giá hiện có
      await existingRating.update({
        rating: rating,
        comment: comment,
        updatedAt: new Date(),
      });

      res.send({
        message: "Đã cập nhật đánh giá của bạn!",
      });
    } else {
      // Tạo đánh giá mới
      await db.rating.create({
        userId: userId,
        bookId: bookId,
        rating: rating,
        comment: comment,
      });

      res.send({
        message: "Đã thêm đánh giá của bạn!",
      });
    }

    // Cập nhật rating trung bình của sách
    const ratings = await db.rating.findAll({
      where: {
        bookId: bookId,
      },
      attributes: ["rating"],
    });

    const avgRating =
      ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length;

    await book.update({
      rating: avgRating.toFixed(1),
      ratingCount: ratings.length,
    });
  } catch (err) {
    logger.error("Error rating book:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi đánh giá sách.",
    });
  }
};

// Lấy bình luận của sách
exports.getComments = async (req, res) => {
  try {
    const bookId = req.params.id;

    const ratings = await db.rating.findAll({
      where: {
        bookId: bookId,
        comment: {
          [db.Sequelize.Op.ne]: null,
          [db.Sequelize.Op.ne]: "",
        },
      },
      include: [
        {
          model: db.user,
          attributes: ["id", "username", "displayName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.send(ratings);
  } catch (err) {
    logger.error("Error fetching book comments:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy bình luận sách.",
    });
  }
};
