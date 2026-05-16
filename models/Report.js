'use strict';
module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    report_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    report_type: {
      type: DataTypes.ENUM('post', 'comment'),
      allowNull: false,
    },
    post_id: {
      type: DataTypes.BIGINT,
      allowNull: true, // 신고 항목이 comment인 경우 null
    },
    comment_id: {
      type: DataTypes.BIGINT,
      allowNull: true, // 신고 항목이 post인 경우 null
    },
    reporter_id: {
      type: DataTypes.BIGINT,
      allowNull: false, // FK 없음, 값만 저장
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Report',
    timestamps: false,
  });
  return Report;
};
