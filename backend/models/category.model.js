module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define(
    "category",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100, true), // Thêm true để hỗ trợ binary collation
        allowNull: false,
        unique: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
      },
      description: {
        type: Sequelize.TEXT("long"),
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
      },
    },
    {
      // Tùy chọn bổ sung
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      tableName: "categories", // Chỉ định tên bảng chính xác
      timestamps: true,
    }
  );

  return Category;
};
