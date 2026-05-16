require('dotenv').config();
const sequelize    = require('../config/database');
const { DataTypes } = require('sequelize');

const Board        = require('./Board')(sequelize, DataTypes);
const BoardRequest = require('./BoardRequest')(sequelize, DataTypes);
const Post         = require('./Post')(sequelize, DataTypes);
const PostImage    = require('./PostImage')(sequelize, DataTypes);
const Comment      = require('./Comment')(sequelize, DataTypes);
const Report       = require('./Report')(sequelize, DataTypes);

// ── 관계 설정 ──────────────────────────
// Board ↔ Post
Board.hasMany(Post, { foreignKey: 'board_id', onDelete: 'CASCADE' });
Post.belongsTo(Board, { foreignKey: 'board_id' });

// Board ↔ BoardRequest
Board.hasMany(BoardRequest, { foreignKey: 'board_id' });
BoardRequest.belongsTo(Board, { foreignKey: 'board_id' });

// Post ↔ PostImage
Post.hasMany(PostImage, { foreignKey: 'post_id', as: 'images', onDelete: 'CASCADE' });
PostImage.belongsTo(Post, { foreignKey: 'post_id' });

// Post ↔ Comment
Post.hasMany(Comment, { foreignKey: 'post_id', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

// Comment self-reference (대댓글)
Comment.hasMany(Comment, { foreignKey: 'parent_comment_id', as: 'Replies', onDelete: 'CASCADE' });
Comment.belongsTo(Comment, { foreignKey: 'parent_comment_id', as: 'Parent' });

// Post ↔ Report
Post.hasMany(Report, { foreignKey: 'post_id', constraints: false });
Report.belongsTo(Post, { foreignKey: 'post_id', constraints: false });

// Comment ↔ Report
Comment.hasMany(Report, { foreignKey: 'comment_id', constraints: false });
Report.belongsTo(Comment, { foreignKey: 'comment_id', constraints: false });

module.exports = { sequelize, Board, BoardRequest, Post, PostImage, Comment, Report };
