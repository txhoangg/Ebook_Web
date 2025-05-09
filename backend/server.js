const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./models");
const logger = require("./utils/logger");
const scheduler = require("./utils/scheduler");

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS với domain cụ thể cho môi trường production
app.use(
  cors({
    origin: [
      "http://localhost:5000", 
      "http://127.0.0.1:5000",
      process.env.FRONTEND_URL || "https://ebook-haven.com"
    ], 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-access-token",
      "Accept",
      "Origin",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các tệp tĩnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

// Router
require("./routes/auth.routes")(app);
require("./routes/book.routes")(app);
require("./routes/category.routes")(app);
require("./routes/user.routes")(app);
require("./routes/admin.routes")(app);

// Endpoint kiểm tra kết nối
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to EbookHaven API", success: true });
});

// API debug chỉ được sử dụng trong môi trường development
if (process.env.NODE_ENV === 'development') {
  app.get("/api/db-test", (req, res) => {
    db.sequelize.authenticate()
      .then(() => {
        res.json({ message: "Database connection is OK", success: true });
      })
      .catch(err => {
        res.status(500).json({ message: "Database connection failed", error: err.message, success: false });
      });
  });
}

// Route mặc định
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Đặt charset
db.sequelize.query("SET NAMES utf8mb4;");

// Đồng bộ hóa database
db.sequelize
  .sync()
  .then(() => {
    logger.info("Database connected successfully");

    // Thực hiện đồng bộ hóa ban đầu
    scheduler.synchronizeDownloadCounts()
      .then((result) => {
        logger.info(result.message);
        logger.info("Initial download count synchronization completed");
        
        // Khởi tạo bộ lập lịch cho các tác vụ định kỳ sau khi đồng bộ hóa ban đầu thành công
        try {
          scheduler.initScheduler();
        } catch (err) {
          logger.warn("Scheduler initialization skipped:", err.message);
          logger.warn("To enable scheduled tasks, run: npm install node-cron");
        }
      })
      .catch((error) => {
        logger.error("Error during initial download synchronization:", error);
      });
  })
  .catch((err) => {
    logger.error("Failed to connect to database:", err);
  });

// Khởi động server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Open http://localhost:${PORT} in your browser`);
});
