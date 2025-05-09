let cron;
try {
  cron = require('node-cron');
} catch (err) {
  console.warn("node-cron module not found. Scheduled tasks will be disabled.");
  console.warn("To enable scheduled tasks, run: npm install node-cron");
}

const logger = require('./logger');
const db = require('../models');

/**
 * Đồng bộ hóa lượt tải xuống sách với bảng downloads
 * @returns {Promise<{success: boolean, message: string}>}
 */
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

/**
 * Đồng bộ hóa số lượng đánh giá và điểm trung bình
 * @returns {Promise<{success: boolean, message: string}>} 
 */
async function synchronizeRatings() {
  try {
    logger.info("Starting ratings synchronization...");

    const [bookRatings] = await db.sequelize.query(`
      SELECT bookId, COUNT(*) as count, AVG(rating) as averageRating 
      FROM ratings 
      GROUP BY bookId
    `);

    logger.info(`Found ${bookRatings.length} books with ratings`);

    for (const item of bookRatings) {
      await db.sequelize.query(
        "UPDATE books SET rating = ?, ratingCount = ? WHERE id = ?",
        {
          replacements: [
            parseFloat(item.averageRating).toFixed(1), 
            item.count, 
            item.bookId
          ],
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );
      logger.info(`Updated book ${item.bookId} with rating ${parseFloat(item.averageRating).toFixed(1)} from ${item.count} ratings`);
    }

    logger.info("Ratings synchronization completed successfully");
    return { success: true, message: "Đồng bộ hóa đánh giá thành công!" };
  } catch (error) {
    logger.error("Error synchronizing ratings:", error);
    return {
      success: false,
      message: "Lỗi khi đồng bộ hóa đánh giá: " + error.message,
    };
  }
}

/**
 * Khởi tạo lịch trình các tác vụ định kỳ
 */
exports.initScheduler = () => {
  if (!cron) {
    logger.warn("Scheduled tasks disabled: node-cron module not installed");
    logger.warn("To enable scheduled tasks, run: npm install node-cron");
    return;
  }
  
  try {
    // Chạy đồng bộ hóa lượt tải vào 3h sáng mỗi ngày
    cron.schedule('0 3 * * *', () => {
      logger.info('Running scheduled download count synchronization');
      synchronizeDownloadCounts();
    });
    
    // Chạy đồng bộ hóa đánh giá vào 4h sáng mỗi ngày
    cron.schedule('0 4 * * *', () => {
      logger.info('Running scheduled ratings synchronization');
      synchronizeRatings();
    });
    
    logger.info('Scheduler initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduler:', error);
  }
};

// Xuất các hàm đồng bộ để có thể gọi theo yêu cầu
exports.synchronizeDownloadCounts = synchronizeDownloadCounts;
exports.synchronizeRatings = synchronizeRatings;
