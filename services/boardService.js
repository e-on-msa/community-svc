// service -> 비즈니스 로직 에러 (게시글 없음, 권한 없음 등)

"use strict";

const {
  Post,
  PostImage,
  Board,
  BoardRequest,
  Comment,
  Report,
  sequelize,
} = require("../models");
const userClient = require("./userClient");

// 게시글 작성
exports.createPost = async ({ board_id, user_id, title, content, files }) => {
  const user = await userClient.getUserById(user_id);

  if (!user)
    throw Object.assign(new Error("사용자 정보를 찾을 수 없습니다."), {
      status: 404,
    });

  const author_name = user.name;

  return await sequelize.transaction(async (t) => {
    const post = await Post.create(
      { board_id, user_id, author_name, title, content, status: "ACTIVE" },
      { transaction: t },
    );

    // ?.는 files가 undefined이거나 null일 때 에러 없이 undefined를 반환하는 옵셔널 체이닝 문법
    if (files?.length) {
      const bulk = files.map((f) => ({
        post_id: post.post_id,
        image_url: f.filename,
      }));
      await PostImage.bulkCreate(bulk, { transaction: t });
    }

    return post;
  });
};

// 게시글 목록 조회
exports.getPostList = async ({ board_id, user_type, page, limit }) => {
  const offset = (page - 1) * limit;

  const whereClause = {
    board_id,
    ...(user_type !== "admin" && { status: "ACTIVE" }),
  };

  const { count, rows: posts } = await Post.findAndCountAll({
    where: whereClause,
    attributes: [
      "post_id",
      "board_id",
      "user_id",
      "author_name",
      "title",
      "status",
      "created_at",
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return { posts, total: count };
};

// 게시글 상세 조회 (이미지 + 댓글 페이징 포함)
exports.getPost = async ({
  post_id,
  board_id,
  user_type,
  comment_page,
  comment_limit,
}) => {
  const comment_offset = (comment_page - 1) * comment_limit;

  const post = await Post.findOne({
    where: {
      post_id,
      board_id,
      ...(user_type !== "admin" && { status: "ACTIVE" }),
    },
    attributes: [
      "post_id",
      "board_id",
      "user_id",
      "author_name",
      "title",
      "content",
      "status",
      "created_at",
      "updated_at",
    ],
    include: [
      {
        model: PostImage,
        as: "images",
        attributes: ["image_id", "image_url"],
      },
    ],
  });

  if (!post)
    throw Object.assign(new Error("게시글을 찾을 수 없습니다."), {
      status: 404,
    });

  const { count, rows: comments } = await Comment.findAndCountAll({
    where: {
      post_id,
      parent_comment_id: null,
      ...(user_type !== "admin" && { status: "ACTIVE" }),
    },
    attributes: [
      "comment_id",
      "user_id",
      "author_name",
      "content",
      "parent_comment_id",
      "created_at",
    ],
    include: [
      {
        model: Comment,
        as: "Replies",
        where: { ...(user_type !== "admin" && { status: "ACTIVE" }) },
        required: false,
        attributes: [
          "comment_id",
          "user_id",
          "author_name",
          "content",
          "parent_comment_id",
          "created_at",
        ],
      },
    ],
    order: [["created_at", "ASC"]],
    limit: comment_limit,
    offset: comment_offset,
  });

  return { post, images: post.images, comments, comment_total: count };
};

// 게시글 수정
exports.updatePost = async ({
  post_id,
  user_id,
  user_type,
  title,
  content,
  removed_image_ids,
  files,
}) => {
  const post = await Post.findByPk(post_id);
  if (!post)
    throw Object.assign(new Error("게시글을 찾을 수 없습니다."), {
      status: 404,
    });

  if (post.user_id !== user_id && user_type !== "admin") {
    throw Object.assign(new Error("수정 권한이 없습니다."), { status: 403 });
  }

  await sequelize.transaction(async (t) => {
    await post.update({ title, content }, { transaction: t });

    if (removed_image_ids?.length) {
      await PostImage.destroy({
        where: { image_id: removed_image_ids, post_id },
        transaction: t,
      });
    }

    if (files?.length) {
      const bulk = files.map((f) => ({ post_id, image_url: f.filename }));
      await PostImage.bulkCreate(bulk, { transaction: t });
    }
  });
};

// 게시글 삭제
exports.deletePost = async ({ post_id, user_id, user_type }) => {
  const post = await Post.findByPk(post_id);
  if (!post)
    throw Object.assign(new Error("게시글을 찾을 수 없습니다."), {
      status: 404,
    });

  if (post.user_id !== user_id && user_type !== "admin") {
    throw Object.assign(new Error("삭제 권한이 없습니다."), { status: 403 });
  }

  await post.destroy();
};

// 댓글 작성
exports.createComment = async ({
  post_id,
  board_id,
  user_id,
  content,
  parent_comment_id,
}) => {
  const post = await Post.findByPk(post_id);
  if (!post)
    throw Object.assign(new Error("게시글을 찾을 수 없습니다."), {
      status: 404,
    });

  if (post.board_id !== board_id) {
    throw Object.assign(new Error("해당 게시판의 게시글이 아닙니다."), {
      status: 400,
    });
  }

  if (post.status === "HIDDEN") {
    throw Object.assign(
      new Error("숨김 처리된 게시글에는 댓글을 작성할 수 없습니다."),
      { status: 403 },
    );
  }

  if (parent_comment_id) {
    const parentComment = await Comment.findByPk(parent_comment_id);
    if (!parentComment)
      throw Object.assign(new Error("부모 댓글을 찾을 수 없습니다."), {
        status: 404,
      });
    if (parentComment.post_id !== post_id) {
      throw Object.assign(
        new Error("부모 댓글이 해당 게시글의 댓글이 아닙니다."),
        { status: 400 },
      );
    }
  }

  const user = await userClient.getUserById(user_id);
  if (!user)
    throw Object.assign(new Error("사용자 정보를 찾을 수 없습니다."), {
      status: 404,
    });

  return await Comment.create({
    post_id,
    user_id,
    author_name: user.name,
    content,
    parent_comment_id: parent_comment_id || null,
  });
};

// 댓글 수정
exports.updateComment = async ({ comment_id, user_id, user_type, content }) => {
  const comment = await Comment.findByPk(comment_id);
  if (!comment)
    throw Object.assign(new Error("댓글을 찾을 수 없습니다."), { status: 404 });

  if (comment.user_id !== user_id && user_type !== "admin") {
    throw Object.assign(new Error("수정 권한이 없습니다."), { status: 403 });
  }

  await comment.update({ content });
};

// 댓글 삭제
exports.deleteComment = async ({ comment_id, user_id, user_type }) => {
  const comment = await Comment.findByPk(comment_id);
  if (!comment)
    throw Object.assign(new Error("댓글을 찾을 수 없습니다."), { status: 404 });

  if (comment.user_id !== user_id && user_type !== "admin") {
    throw Object.assign(new Error("삭제 권한이 없습니다."), { status: 403 });
  }

  await comment.destroy();
};

// 게시판 개설 신청
exports.createBoardRequest = async ({
  user_id,
  user_type,
  requested_board_name,
  requested_board_type,
  board_audience,
  request_reason,
}) => {
  if (!["student", "parent", "all"].includes(board_audience)) {
    throw Object.assign(
      new Error("board_audience는 student, parent, all 중 하나여야 합니다."),
      { status: 400 },
    );
  }

  if (
    user_type !== "admin" &&
    board_audience !== "all" &&
    board_audience !== user_type
  ) {
    throw Object.assign(new Error("해당 게시판 유형은 신청할 수 없습니다."), {
      status: 403,
    });
  }

  return await BoardRequest.create({
    user_id,
    requested_board_name,
    requested_board_type,
    board_audience,
    request_reason,
  });
};

// 게시판 개설 신청 목록 조회 (관리자)
exports.getBoardRequestList = async ({ page, limit }) => {
  const offset = (page - 1) * limit;

  const { count, rows: requests } = await BoardRequest.findAndCountAll({
    order: [["request_date", "DESC"]],
    limit,
    offset,
  });

  return { requests, total: count };
};

// 게시판 개설 승인/거절 (관리자)
exports.updateBoardRequestStatus = async ({ request_id, request_status }) => {
  const boardRequest = await BoardRequest.findByPk(request_id);
  if (!boardRequest)
    throw Object.assign(new Error("게시판 개설 신청을 찾을 수 없습니다."), {
      status: 404,
    });

  if (request_status === "approved") {
    await sequelize.transaction(async (t) => {
      const lockedRequest = await BoardRequest.findByPk(request_id, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (lockedRequest.request_status !== "pending") {
        throw new Error("ALREADY_PROCESSED");
      }

      const newBoard = await Board.create(
        {
          board_name: boardRequest.requested_board_name,
          board_type: boardRequest.requested_board_type,
          board_audience: boardRequest.board_audience,
        },
        { transaction: t },
      );

      await boardRequest.update(
        { request_status: "approved", board_id: newBoard.board_id },
        { transaction: t },
      );
    });
  } else {
    await sequelize.transaction(async (t) => {
      const lockedRequest = await BoardRequest.findByPk(request_id, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (lockedRequest.request_status !== "pending") {
        throw new Error("ALREADY_PROCESSED");
      }

      await boardRequest.update(
        { request_status: "rejected" },
        { transaction: t },
      );
    });
  }
};

// 신고 접수
exports.createReport = async ({
  reporter_id,
  report_type,
  post_id,
  comment_id,
  reason,
}) => {
  // 신고 타입 유효성 검사
  if (!["post", "comment"].includes(report_type)) {
    throw Object.assign(
      new Error("report_type은 post 또는 comment여야 합니다."),
      { status: 400 },
    );
  }

  // 신고 대상 존재 여부 확인
  if (report_type === "post") {
    if (!post_id)
      throw Object.assign(new Error("post_id는 필수입니다."), { status: 400 });
    const post = await Post.findByPk(post_id);
    if (!post)
      throw Object.assign(new Error("게시글을 찾을 수 없습니다."), {
        status: 404,
      });
    if (post.user_id === reporter_id)
      throw Object.assign(new Error("자신의 게시글은 신고할 수 없습니다."), {
        status: 400,
      });
    if (post.status === "HIDDEN")
      throw Object.assign(
        new Error("숨김 처리된 게시글은 신고할 수 없습니다."),
        { status: 403 },
      );
  } else {
    if (!comment_id)
      throw Object.assign(new Error("comment_id는 필수입니다."), {
        status: 400,
      });
    const comment = await Comment.findByPk(comment_id);
    if (!comment)
      throw Object.assign(new Error("댓글을 찾을 수 없습니다."), {
        status: 404,
      });
    if (comment.user_id === reporter_id)
      throw Object.assign(new Error("자신의 댓글은 신고할 수 없습니다."), {
        status: 400,
      });
    if (comment.status === "HIDDEN")
      throw Object.assign(new Error("숨김 처리된 댓글은 신고할 수 없습니다."), {
        status: 403,
      });
  }

  return await Report.create({
    reporter_id,
    report_type,
    post_id: report_type === "post" ? post_id : null,
    comment_id: report_type === "comment" ? comment_id : null,
    reason,
  });
};
