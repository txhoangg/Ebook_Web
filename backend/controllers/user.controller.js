const db = require("../models");
const User = db.user;
const Book = db.book;
const Category = db.category;
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

// Lấy thông tin cá nhân
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ["password"], // Không trả về mật khẩu
      },
    });

    if (!user) {
      return res.status(404).send({
        message: "Không tìm thấy thông tin người dùng!",
      });
    }

    // Đếm số sách đã upload
    const uploadCount = await Book.count({
      where: {
        uploaderId: userId,
      },
    });

    // Trả về thông tin
    const userProfile = {
      ...user.toJSON(),
      uploadCount,
    };

    res.send(userProfile);
  } catch (err) {
    logger.error("Error fetching user profile:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy thông tin người dùng.",
    });
  }
};

// Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { displayName, bio, currentPassword, newPassword } = req.body;

    // Kiểm tra người dùng tồn tại
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).send({
        message: "Không tìm thấy thông tin người dùng!",
      });
    }

    // Cập nhật thông tin
    const updateData = {};

    if (displayName) {
      updateData.displayName = displayName;
    }

    if (bio !== undefined) {
      updateData.bio = bio;
    }

    // Nếu muốn thay đổi mật khẩu
    if (newPassword && currentPassword) {
      // Kiểm tra mật khẩu hiện tại
      const passwordIsValid = bcrypt.compareSync(
        currentPassword,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          message: "Mật khẩu hiện tại không đúng!",
        });
      }

      // Mã hóa mật khẩu mới
      updateData.password = bcrypt.hashSync(newPassword, 8);
    }

    // Cập nhật thông tin
    const result = await User.update(updateData, {
      where: { id: userId },
    });

    if (result[0] === 1) {
      res.send({
        success: true,
        message: "Thông tin đã được cập nhật!",
      });
    } else {
      res.send({
        success: false,
        message: "Không thể cập nhật thông tin.",
      });
    }
  } catch (err) {
    logger.error("Error updating user profile:", err);
    res.status(500).send({
      message:
        err.message || "Đã xảy ra lỗi khi cập nhật thông tin người dùng.",
    });
  }
};

// Lấy danh sách sách đã upload
exports.getMyBooks = async (req, res) => {
  try {
    const userId = req.userId;

    const books = await Book.findAll({
      where: {
        uploaderId: userId,
      },
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
      order: [["createdAt", "DESC"]],
    });

    res.send(books);
  } catch (err) {
    logger.error("Error fetching user books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách sách.",
    });
  }
};

// Lấy danh sách sách yêu thích
exports.getFavoriteBooks = async (req, res) => {
  try {
    const userId = req.userId;

    // Phương pháp thay thế: Lấy tất cả bookId từ user_favorites
    const favorites = await db.user_favorite.findAll({
      attributes: ["bookId", "addedAt"],
      where: { userId: userId },
      order: [["addedAt", "DESC"]],
    });

    // Lấy tất cả ID sách yêu thích
    const bookIds = favorites.map((fav) => fav.bookId);

    // Nếu không có sách yêu thích nào, trả về mảng rỗng
    if (bookIds.length === 0) {
      return res.send([]);
    }

    // Lấy thông tin chi tiết của sách
    const books = await Book.findAll({
      where: { id: bookIds },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    // Tạo map để lưu trữ addedAt theo bookId
    const addedDates = {};
    favorites.forEach((favorite) => {
      addedDates[favorite.bookId] = favorite.addedAt;
    });

    // Thêm addedAt vào thông tin sách
    const formattedBooks = books.map((book) => {
      const bookData = book.toJSON();
      return {
        ...bookData,
        addedAt: addedDates[book.id],
      };
    });

    // Sắp xếp theo thứ tự addedAt giảm dần
    formattedBooks.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    res.send(formattedBooks);
  } catch (err) {
    logger.error("Error fetching favorite books:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách sách yêu thích.",
    });
  }
};

// Lấy lịch sử tải xuống
exports.getDownloadHistory = async (req, res) => {
  try {
    const userId = req.userId;

    // Lấy tất cả lịch sử tải xuống
    const downloads = await db.download.findAll({
      attributes: ["bookId", "downloadedAt"],
      where: { userId: userId },
      order: [["downloadedAt", "DESC"]],
    });

    // Lấy tất cả ID sách đã tải
    const bookIds = downloads.map((download) => download.bookId);

    // Nếu không có sách nào được tải, trả về mảng rỗng
    if (bookIds.length === 0) {
      return res.send([]);
    }

    // Lấy thông tin của sách
    const books = await Book.findAll({
      where: { id: bookIds },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    // Tạo map để tìm downloadedAt dựa vào bookId
    const downloadDates = {};
    downloads.forEach((download) => {
      downloadDates[download.bookId] = download.downloadedAt;
    });

    // Thêm downloadedAt vào thông tin sách
    const formattedBooks = books.map((book) => {
      const bookData = book.toJSON();
      return {
        ...bookData,
        downloadedAt: downloadDates[book.id],
      };
    });

    // Sắp xếp theo thứ tự downloadedAt giảm dần
    formattedBooks.sort(
      (a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt)
    );

    res.send(formattedBooks);
  } catch (err) {
    logger.error("Error fetching download history:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy lịch sử tải xuống.",
    });
  }
};

// Thêm sách vào yêu thích - Sửa để tránh lỗi createdAt
exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;

    console.log(`Adding book ${bookId} to favorites for user ${userId}`);

    // Kiểm tra sách tồn tại
    const book = await Book.findByPk(bookId);

    if (!book) {
      return res.status(404).send({
        message: "Không tìm thấy sách!",
      });
    }

    // Kiểm tra người dùng đã thêm sách này vào yêu thích chưa
    // Sử dụng raw query để tránh lỗi với Sequelize
    const existingFavorites = await db.sequelize.query(
      "SELECT userId, bookId FROM user_favorites WHERE userId = ? AND bookId = ?",
      {
        replacements: [userId, bookId],
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (existingFavorites && existingFavorites.length > 0) {
      return res.status(400).send({
        message: "Sách này đã được thêm vào danh sách yêu thích!",
      });
    }

    // Thêm vào yêu thích sử dụng raw query
    await db.sequelize.query(
      "INSERT INTO user_favorites (userId, bookId, addedAt) VALUES (?, ?, ?)",
      {
        replacements: [userId, bookId, new Date()],
        type: db.sequelize.QueryTypes.INSERT,
      }
    );

    res.send({
      success: true,
      message: "Đã thêm sách vào danh sách yêu thích!",
    });
  } catch (err) {
    logger.error("Error adding to favorites:", err);
    res.status(500).send({
      success: false,
      message: err.message || "Đã xảy ra lỗi khi thêm sách vào yêu thích.",
    });
  }
};

// Xóa sách khỏi yêu thích - Sửa để tránh lỗi createdAt
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;

    // Kiểm tra và xóa sử dụng raw query
    const result = await db.sequelize.query(
      "DELETE FROM user_favorites WHERE userId = ? AND bookId = ?",
      {
        replacements: [userId, bookId],
        type: db.sequelize.QueryTypes.DELETE,
      }
    );

    // Kiểm tra số hàng bị ảnh hưởng (ở vị trí thứ 1 của mảng kết quả)
    if (result[1] > 0) {
      res.send({
        success: true,
        message: "Đã xóa sách khỏi danh sách yêu thích!",
      });
    } else {
      res.status(404).send({
        success: false,
        message: "Sách không có trong danh sách yêu thích!",
      });
    }
  } catch (err) {
    logger.error("Error removing from favorites:", err);
    res.status(500).send({
      success: false,
      message: err.message || "Đã xảy ra lỗi khi xóa sách khỏi yêu thích.",
    });
  }
};

// Xóa sách khỏi yêu thích
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;

    // Kiểm tra và xóa
    const result = await db.user_favorite.destroy({
      where: {
        userId: userId,
        bookId: bookId,
      },
    });

    if (result === 1) {
      res.send({
        message: "Đã xóa sách khỏi danh sách yêu thích!",
      });
    } else {
      res.status(404).send({
        message: "Sách không có trong danh sách yêu thích!",
      });
    }
  } catch (err) {
    logger.error("Error removing from favorites:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi xóa sách khỏi yêu thích.",
    });
  }
};
