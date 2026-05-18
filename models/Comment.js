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
      parent_comment_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // 대댓글용, 없으면 null
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "HIDDEN"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "Comment",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
  return Comment;
};
