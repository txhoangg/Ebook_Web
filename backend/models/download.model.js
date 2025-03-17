module.exports = (sequelize, Sequelize) => {
  const Download = sequelize.define("download", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    bookId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    downloadedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    ipAddress: {
      type: Sequelize.STRING,
    },
    userAgent: {
      type: Sequelize.STRING,
    },
  });

  return Download;
};
