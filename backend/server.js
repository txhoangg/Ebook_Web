const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./models");
const logger = require("./utils/logger");



const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));


require("./routes/auth.routes")(app);
require("./routes/book.routes")(app);
require("./routes/category.routes")(app);
require("./routes/user.routes")(app);

require("./routes/admin.routes")(app); 

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to EbookHaven API" });
});


app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

db.sequelize.query("SET NAMES utf8mb4;");


async function synchronizeDownloadCounts() {
  try {
    logger.info("Starting download count synchronization...");


    const [downloadsPerBook] = await db.sequelize.query(
      "SELECT bookId, COUNT(*) as count FROM downloads GROUP BY bookId"
    );

    logger.info(`Found ${downloadsPerBook.length} books with download records`);

   
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


db.sequelize
  .sync()
  .then(() => {
    logger.info("Database connected successfully");

 
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


app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Open http://localhost:${PORT} in your browser`);
});
