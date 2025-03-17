// backend/utils/logger.js
const logger = {
  info: function (message) {
    console.log(`[INFO] ${message}`);
  },
  error: function (message, error) {
    console.error(`[ERROR] ${message}`, error || "");
  },
  warn: function (message) {
    console.warn(`[WARN] ${message}`);
  },
  debug: function (message) {
    console.debug(`[DEBUG] ${message}`);
  },
};

module.exports = logger;
