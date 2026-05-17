"use strict";
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      post_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      board_id: {
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
      title: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "HIDDEN"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "Post",
      timestamps: true,
      underscored: true, // created_at, updated_at 스네이크 케이스로 변경
      createdAt: "created_at",
      updatedAt: "updated_at", // squelize JS 속성 이름도 created_at, updated_at로 변경
    },
  );
  return Post;
};
