const path = require("path");

/**
 * Chuyển đổi đường dẫn tương đối thành đường dẫn tuyệt đối
 * @param {string} relativePath - Đường dẫn tương đối
 * @returns {string|null} - Đường dẫn tuyệt đối hoặc null nếu đường dẫn không hợp lệ
 */
exports.getAbsolutePath = function(relativePath) {
  if (!relativePath) return null;
  // Loại bỏ dấu / ở đầu nếu có
  const normalizedPath = relativePath.startsWith("/") 
    ? relativePath.substring(1) 
    : relativePath;
  // Tạo đường dẫn tuyệt đối
  return path.join(__dirname, "..", normalizedPath);
};
