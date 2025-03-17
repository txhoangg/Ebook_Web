const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const path = require("path");
// const dotenv = require("dotenv");
const db = require("./models");
const logger = require("./utils/logger");

// Load environment variables
// dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes API
require("./routes/auth.routes")(app);
require("./routes/book.routes")(app);
require("./routes/category.routes")(app);
require("./routes/user.routes")(app);
// Trong phần routes
require("./routes/admin.routes")(app); // Thêm route admin
// Default route for API
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to EbookHaven API" });
});

// Serve frontend for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});
// Thêm vào phần khởi tạo Sequelize
db.sequelize.query("SET NAMES utf8mb4;");

// Hàm đồng bộ hóa lượt tải xuống
async function synchronizeDownloadCounts() {
  try {
    logger.info("Starting download count synchronization...");

    // Lấy tổng số lượt tải thực tế từ bảng downloads cho mỗi sách
    const [downloadsPerBook] = await db.sequelize.query(
      "SELECT bookId, COUNT(*) as count FROM downloads GROUP BY bookId"
    );

    logger.info(`Found ${downloadsPerBook.length} books with download records`);

    // Cập nhật lại downloadCount trong bảng books
    for (const item of downloadsPerBook) {
      await db.sequelize.query(
        "UPDATE books SET downloadCount = ? WHERE id = ?",
        {
          replacements: [item.count, item.bookId],
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );
      logger.info(`Updated book ${item.bookId} with ${item.count} downloads`);
    }

    logger.info("Download count synchronization completed successfully");
    return { success: true, message: "Đồng bộ hóa lượt tải thành công!" };
  } catch (error) {
    logger.error("Error synchronizing download counts:", error);
    return {
      success: false,
      message: "Lỗi khi đồng bộ hóa lượt tải: " + error.message,
    };
  }
}

// Connect to database
db.sequelize
  .sync()
  .then(() => {
    logger.info("Database connected successfully");

    // Đồng bộ hóa lượt tải xuống khi khởi động server
    synchronizeDownloadCounts()
      .then((result) => {
        logger.info(result.message);
        logger.info("Initial download count synchronization completed");
      })
      .catch((error) => {
        logger.error("Error during initial download synchronization:", error);
      });
  })
  .catch((err) => {
    logger.error("Failed to connect to database:", err);
  });

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Open http://localhost:${PORT} in your browser`);
});
