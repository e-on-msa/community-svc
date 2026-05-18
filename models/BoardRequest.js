"use strict";
module.exports = (sequelize, DataTypes) => {
  const BoardRequest = sequelize.define(
    "BoardRequest",
    {
      request_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      board_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // 승인 전 null
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false, // FK 없음, 값만 저장
      },
      requested_board_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      requested_board_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      board_audience: {
        type: DataTypes.ENUM("student", "parent", "all"),
        allowNull: false,
      },
      request_reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      request_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      request_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "BoardRequest",
      timestamps: false,
    },
  );
  return BoardRequest;
};
