module.exports = (sequelize, Sequelize) => {
  const Book = sequelize.define("book", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    author: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    coverPath: {
      type: Sequelize.STRING,
    },
    filePath: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    fileType: {
      type: Sequelize.STRING,
    },
    fileSize: {
      type: Sequelize.INTEGER,
    },
    pageCount: {
      type: Sequelize.INTEGER,
    },
    language: {
      type: Sequelize.STRING,
    },
    publishYear: {
      type: Sequelize.INTEGER,
    },
    isbn: {
      type: Sequelize.STRING,
    },
    rating: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    downloadCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    featured: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: Sequelize.ENUM("active", "inactive", "pending"),
      defaultValue: "active",
    },
    uploaderId: {
      type: Sequelize.INTEGER,
      references: {
        model: "users", // Tên bảng tham chiếu
        key: "id", // Khóa chính của bảng tham chiếu
      },
    },
  });

  return Book;
};
