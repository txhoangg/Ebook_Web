const db = require("../models");
const Category = db.category;
const Book = db.book;
const Op = db.Sequelize.Op;
const logger = require("../utils/logger");

// Lấy tất cả danh mục
exports.findAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: Book,
          as: "books",
          // Chỉ lấy ID để đếm số lượng sách
          attributes: ["id"],
        },
      ],
    });

    // Định dạng lại response để bao gồm số lượng sách
    const formattedCategories = categories.map((category) => {
      const categoryJson = category.toJSON();
      return {
        id: categoryJson.id,
        name: categoryJson.name,
        description: categoryJson.description,
        bookCount: categoryJson.books ? categoryJson.books.length : 0,
        createdAt: categoryJson.createdAt,
        updatedAt: categoryJson.updatedAt,
      };
    });

    res.send(formattedCategories);
  } catch (err) {
    logger.error("Error retrieving categories:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi lấy danh sách danh mục.",
    });
  }
};

// Lấy chi tiết một danh mục theo ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Book,
          as: "books",
          // Thêm attributes để chỉ định rõ các cột cần lấy
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
        },
      ],
    });

    if (category) {
      res.send(category);
    } else {
      res.status(404).send({
        message: `Không tìm thấy danh mục với id=${id}.`,
      });
    }
  } catch (err) {
    logger.error(`Error retrieving category with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi lấy thông tin danh mục id=${req.params.id}`,
    });
  }
};

// Tạo danh mục mới sử dụng raw query để tránh vấn đề encoding
// Thay thế hàm create trong file category.controller.js
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.name) {
      return res.status(400).send({
        message: "Tên danh mục không được để trống!",
      });
    }

    // Kiểm tra danh mục đã tồn tại
    const existingCategory = await Category.findOne({
      where: { name: req.body.name },
    });

    if (existingCategory) {
      return res.status(400).send({
        message: "Danh mục đã tồn tại!",
      });
    }

    // Tạo danh mục mới sử dụng ORM thay vì raw query
    const category = await Category.create({
      name: req.body.name,
      description: req.body.description || "",
    });

    res.send(category);
  } catch (err) {
    logger.error("Error creating category:", err);
    res.status(500).send({
      message: err.message || "Đã xảy ra lỗi khi tạo danh mục mới.",
    });
  }
};
// Cập nhật danh mục
exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    // Validate request
    if (!req.body.name) {
      return res.status(400).send({
        message: "Tên danh mục không được để trống!",
      });
    }

    const categoryName = req.body.name;
    const categoryDescription = req.body.description || "";

    // Kiểm tra danh mục đã tồn tại bằng raw query
    const [existingCategories] = await db.sequelize.query(
      "SELECT * FROM categories WHERE name = ? AND id != ?",
      {
        replacements: [categoryName, id],
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (existingCategories && existingCategories.length > 0) {
      return res.status(400).send({
        message: "Tên danh mục đã tồn tại!",
      });
    }

    // Cập nhật danh mục bằng raw query
    const [result, metadata] = await db.sequelize.query(
      "UPDATE categories SET name = ?, description = ?, updatedAt = NOW() WHERE id = ?",
      {
        replacements: [categoryName, categoryDescription, id],
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    if (metadata > 0) {
      res.send({
        message: "Danh mục đã được cập nhật thành công.",
      });
    } else {
      res.send({
        message: `Không thể cập nhật danh mục với id=${id}. Có thể danh mục không tồn tại!`,
      });
    }
  } catch (err) {
    logger.error(`Error updating category with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Lỗi khi cập nhật danh mục với id=${req.params.id}`,
    });
  }
};

// Xóa danh mục
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // Kiểm tra xem có sách nào thuộc danh mục này không
    // Chỉ lấy ID thay vì tất cả các trường
    const books = await Book.findAll({
      where: { categoryId: id },
      attributes: ["id"], // Chỉ lấy ID để tránh lỗi với các trường khác
    });

    if (books.length > 0) {
      return res.status(400).send({
        message: `Không thể xóa danh mục vì có ${books.length} sách thuộc danh mục này.`,
      });
    }

    const result = await Category.destroy({
      where: { id: id },
    });

    if (result === 1) {
      res.send({
        message: "Danh mục đã được xóa thành công!",
      });
    } else {
      res.send({
        message: `Không thể xóa danh mục với id=${id}. Có thể danh mục không tồn tại!`,
      });
    }
  } catch (err) {
    logger.error(`Error deleting category with id=${req.params.id}:`, err);
    res.status(500).send({
      message: `Không thể xóa danh mục với id=${req.params.id}`,
    });
  }
};
