const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
  logging: process.env.NODE_ENV === "production" ? false : console.log,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.user = require("./user.model.js")(sequelize, Sequelize);
db.book = require("./book.model.js")(sequelize, Sequelize);
db.category = require("./category.model.js")(sequelize, Sequelize);
db.download = require("./download.model.js")(sequelize, Sequelize);
db.rating = require("./rating.model.js")(sequelize, Sequelize);

// Định nghĩa model cho bảng trung gian user_favorite
db.user_favorite = sequelize.define(
  "user_favorite",
  {
    userId: {
      type: Sequelize.INTEGER,
      references: {
        model: db.user,
        key: "id",
      },
    },
    bookId: {
      type: Sequelize.INTEGER,
      references: {
        model: db.book,
        key: "id",
      },
    },
    addedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    // Quan trọng: tắt timestamps để Sequelize không tự động thêm createdAt và updatedAt
    timestamps: false,
    // Đảm bảo tên bảng đúng
    tableName: "user_favorites",
    // Tắt thay đổi tên trường thành snake_case
    underscored: false,
  }
);

// Relationships
db.category.hasMany(db.book, { as: "books" });
db.book.belongsTo(db.category, {
  foreignKey: "categoryId",
  as: "category",
});

// Quan hệ user và book - Sửa lại để sử dụng uploaderId nhất quán
db.user.hasMany(db.book, {
  foreignKey: "uploaderId",
  as: "uploads",
});
db.book.belongsTo(db.user, {
  foreignKey: "uploaderId",
  as: "uploader",
});

// Many-to-many relationship for user favorites
// Sửa lại để chỉ rõ tên các khóa ngoại và không sử dụng userId
db.user.belongsToMany(db.book, {
  through: db.user_favorite,
  as: "favoriteBooks",
  foreignKey: "userId",
  otherKey: "bookId",
});
db.book.belongsToMany(db.user, {
  through: db.user_favorite,
  as: "favoritedBy",
  foreignKey: "bookId",
  otherKey: "userId",
});

// Download relationship
db.user.hasMany(db.download, { foreignKey: "userId" });
db.download.belongsTo(db.user, { foreignKey: "userId" });
db.book.hasMany(db.download, { foreignKey: "bookId" });
db.download.belongsTo(db.book, { foreignKey: "bookId" });

// Rating relationship
db.user.hasMany(db.rating, { foreignKey: "userId" });
db.rating.belongsTo(db.user, { foreignKey: "userId" });
db.book.hasMany(db.rating, { foreignKey: "bookId", as: "ratings" });
db.rating.belongsTo(db.book, { foreignKey: "bookId" });

module.exports = db;
