/**
 * Module xác thực và làm sạch dữ liệu đầu vào
 */
const validator = {
  /**
   * Xác thực và làm sạch chuỗi đầu vào
   * @param {string} input - Chuỗi cần xác thực
   * @param {number} maxLength - Độ dài tối đa cho phép
   * @returns {string} - Chuỗi đã được làm sạch
   */
  sanitizeString: (input, maxLength = 255) => {
    if (!input) return '';
    
    // Chuyển về chuỗi và cắt theo độ dài
    let sanitized = String(input).trim().slice(0, maxLength);
    
    // Loại bỏ các ký tự nguy hiểm
    sanitized = sanitized.replace(/[<>]/g, '');
    
    return sanitized;
  },
  
  /**
   * Xác thực email
   * @param {string} email - Email cần xác thực
   * @returns {boolean} - Kết quả xác thực
   */
  isValidEmail: (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
  },
  
  /**
   * Xác thực số nguyên
   * @param {any} value - Giá trị cần xác thực
   * @param {number} min - Giá trị tối thiểu
   * @param {number} max - Giá trị tối đa
   * @returns {boolean} - Kết quả xác thực
   */
  isValidInteger: (value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined || value === null) return false;
    
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num) && num >= min && num <= max;
  },
  
  /**
   * Kiểm tra đối tượng có chứa các trường bắt buộc không
   * @param {object} obj - Đối tượng cần kiểm tra
   * @param {string[]} requiredFields - Mảng các trường bắt buộc
   * @returns {string[]} - Mảng tên các trường còn thiếu
   */
  getMissingFields: (obj, requiredFields) => {
    if (!obj || typeof obj !== 'object') return requiredFields;
    
    return requiredFields.filter(field => {
      return obj[field] === undefined || obj[field] === null || obj[field] === '';
    });
  },
  
  /**
   * Xác thực URL
   * @param {string} url - URL cần xác thực 
   * @returns {boolean} - Kết quả xác thực
   */
  isValidUrl: (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Làm sạch dữ liệu đầu vào của đối tượng (sanitize)
   * @param {object} data - Đối tượng cần làm sạch
   * @param {object} schema - Mô tả cách làm sạch từng trường
   * @returns {object} - Đối tượng đã được làm sạch
   */
  sanitizeObject: (data, schema) => {
    if (!data || typeof data !== 'object') return {};
    
    const result = {};
    
    Object.keys(schema).forEach(field => {
      if (data[field] !== undefined) {
        const fieldType = schema[field].type;
        const maxLength = schema[field].maxLength;
        
        switch(fieldType) {
          case 'string':
            result[field] = validator.sanitizeString(data[field], maxLength);
            break;
          case 'integer':
            const min = schema[field].min !== undefined ? schema[field].min : Number.MIN_SAFE_INTEGER;
            const max = schema[field].max !== undefined ? schema[field].max : Number.MAX_SAFE_INTEGER;
            const numValue = Number(data[field]);
            
            if (!isNaN(numValue) && validator.isValidInteger(numValue, min, max)) {
              result[field] = numValue;
            } else if (schema[field].default !== undefined) {
              result[field] = schema[field].default;
            }
            break;
          case 'boolean':
            result[field] = Boolean(data[field]);
            break;
          default:
            result[field] = data[field];
        }
      } else if (schema[field].default !== undefined) {
        result[field] = schema[field].default;
      }
    });
    
    return result;
  }
};

module.exports = validator;
