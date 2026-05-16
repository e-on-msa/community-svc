'use strict';
module.exports = (sequelize, DataTypes) => {
  const PostImage = sequelize.define('PostImage', {
    image_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    post_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
  }, {
    tableName: 'PostImage',
    timestamps: false,
  });
  return PostImage;
};
