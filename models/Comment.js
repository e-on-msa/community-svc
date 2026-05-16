"use strict";
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      comment_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      post_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false, // FK 없음, 값만 저장
      },
      author_name: {
        type: DataTypes.STRING(50),
        allowNull: false, // 작성 시 user-svc에서 조회해서 저장
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      parent_comment_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // 대댓글용, 없으면 null
      },
    },
    {
      tableName: "Comment",
      timestamps: true,
    },
  );
  return Comment;
};
