const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Tạo thư mục uploads nếu chưa tồn tại
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
};

const booksDir = path.join(__dirname, "../uploads/books");
const coversDir = path.join(__dirname, "../uploads/covers");

createDir(booksDir);
createDir(coversDir);

// Xử lý lưu trữ file sách
const bookStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, booksDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: timestamp + random string + extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 12);
    const ext = path.extname(file.originalname);

    cb(null, `book-${timestamp}-${randomString}${ext}`);
  },
});

// Xử lý lưu trữ ảnh bìa
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: timestamp + random string + extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 12);
    const ext = path.extname(file.originalname);

    cb(null, `cover-${timestamp}-${randomString}${ext}`);
  },
});

// Kiểm tra loại file sách
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/epub+zip",
    "application/x-mobipocket-ebook",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Không hỗ trợ định dạng file này. Vui lòng tải lên định dạng PDF, EPUB hoặc MOBI."
      ),
      false
    );
  }
};

// Kiểm tra loại file ảnh
const imageFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Không hỗ trợ định dạng ảnh này. Vui lòng tải lên định dạng JPG hoặc PNG."
      ),
      false
    );
  }
};

// Giới hạn kích thước file
const MAX_BOOK_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

// Middleware upload file sách
const uploadBook = multer({
  storage: bookStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_BOOK_SIZE,
  },
}).single("file");

// Middleware upload ảnh bìa
const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_COVER_SIZE,
  },
}).single("cover");

// Middleware xử lý cả 2 loại file
const uploadFiles = (req, res, next) => {
  // Sử dụng multer.fields để xử lý nhiều file từ các trường khác nhau
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // Phân biệt destination dựa trên fieldname
        if (file.fieldname === "file") {
          cb(null, booksDir);
        } else if (file.fieldname === "cover") {
          cb(null, coversDir);
        }
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 12);
        const ext = path.extname(file.originalname);

        if (file.fieldname === "file") {
          cb(null, `book-${timestamp}-${randomString}${ext}`);
        } else if (file.fieldname === "cover") {
          cb(null, `cover-${timestamp}-${randomString}${ext}`);
        }
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.fieldname === "file") {
        // Kiểm tra loại file sách
        const allowedMimes = [
          "application/pdf",
          "application/epub+zip",
          "application/x-mobipocket-ebook",
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Không hỗ trợ định dạng file này. Vui lòng tải lên định dạng PDF, EPUB hoặc MOBI."
            ),
            false
          );
        }
      } else if (file.fieldname === "cover") {
        // Kiểm tra loại file ảnh
        const allowedMimes = ["image/jpeg", "image/png"];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Không hỗ trợ định dạng ảnh này. Vui lòng tải lên định dạng JPG hoặc PNG."
            ),
            false
          );
        }
      }
    },
    limits: {
      fileSize: (req, file) => {
        return file.fieldname === "file" ? MAX_BOOK_SIZE : MAX_COVER_SIZE;
      },
    },
  }).fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).send({
            message: `File quá lớn. Giới hạn ${
              err.field === "file"
                ? MAX_BOOK_SIZE / (1024 * 1024)
                : MAX_COVER_SIZE / (1024 * 1024)
            }MB.`,
          });
        }
      }

      logger.error("Error uploading files:", err);
      return res.status(400).send({
        message: err.message || "Lỗi khi tải lên file.",
      });
    }

    // Đã xóa phần kiểm tra bắt buộc file sách để cho phép chỉ upload ảnh bìa khi cập nhật

    // Lưu đường dẫn file vào req.body để dễ dàng truy cập
    if (req.files && req.files.file && req.files.file[0]) {
      // Lưu file sách với đường dẫn tương đối cho database
      req.file = req.files.file[0]; // Để tương thích với code cũ

      // Cập nhật đường dẫn thành đường dẫn tương đối
      const filename = path.basename(req.file.path);
      req.file.path = `uploads/books/${filename}`;

      // Log cho debug
      logger.info(`File path set to: ${req.file.path}`);
    }

    if (req.files && req.files.cover && req.files.cover[0]) {
      // Chuyển đổi đường dẫn tuyệt đối thành đường dẫn tương đối cho web
      const filename = path.basename(req.files.cover[0].path);
      req.body.coverPath = `uploads/covers/${filename}`;

      // Log cho debug
      logger.info(`Cover path set to: ${req.body.coverPath}`);
    }

    next();
  });
};

module.exports = {
  uploadBook,
  uploadCover,
  uploadFiles,
};
