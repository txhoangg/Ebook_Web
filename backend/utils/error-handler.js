const logger = require("./logger");

/**
 * Xử lý lỗi chung cho API response
 * @param {Error} error - Đối tượng lỗi
 * @param {object} res - Express response object
 * @param {string} action - Mô tả hành động đang thực hiện
 * @param {number} status - HTTP status code (mặc định: 500)
 */
exports.handleApiError = (error, res, action, status = 500) => {
  logger.error(`Lỗi khi ${action}:`, error);
  
  // Kiểm tra các loại lỗi đặc biệt
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: `Lỗi xác thực dữ liệu: ${error.message}`,
      errors: error.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại trong hệ thống',
      field: error.errors[0]?.path
    });
  }

  // Lỗi thông thường
  return res.status(status).json({
    success: false,
    message: `Lỗi khi ${action}: ${error.message || 'Có lỗi xảy ra'}`
  });
};
