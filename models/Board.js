'use strict';
module.exports = (sequelize, DataTypes) => {
  const Board = sequelize.define('Board', {
    board_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    board_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    board_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    board_audience: {
      type: DataTypes.ENUM('student', 'parent', 'all'),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Board',
    timestamps: false,
  });
  return Board;
};
