// controller -> 요청 입력값 유효성 검사 (title, content 없는 경우 등)

"use strict";

const boardService = require("../services/boardService");

// TODO: 게시판 목록 조회
exports.getBoardList = async (req, res) => {
  res.json({ message: "getBoardList - TODO" });
};

// 게시글 작성
exports.createPost = async (req, res) => {
  const board_id = Number(req.params.board_id);
  if (isNaN(board_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시판 ID입니다." });
  }
  const user_id = req.user.user_id;
  const { title, content } = req.body;
  const files = req.files;

  if (!title || !content) {
    return res.status(400).json({ error: "title, content는 필수입니다." });
  }

  try {
    const newPost = await boardService.createPost({
      board_id,
      user_id,
      title,
      content,
      files,
    });
    res.status(201).json({ post: newPost });
  } catch (err) {
    console.error("게시글 작성 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "게시글 작성 중 오류가 발생했습니다." });
  }
};

// 게시글 목록 조회
exports.getPostList = async (req, res) => {
  const board_id = Number(req.params.board_id);
  if (isNaN(board_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시판 ID입니다." });
  }

  const user_type = req.headers["x-user-type"];
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  try {
    const { posts, total } = await boardService.getPostList({
      board_id,
      user_type,
      page,
      limit,
    });
    res.status(200).json({
      posts,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("게시글 목록 조회 실패:", err);
    res.status(err.status || 500).json({
      error: err.message || "게시글 목록 조회 중 오류가 발생했습니다.",
    });
  }
};

// 게시글 상세 조회 (댓글 목록 포함)
exports.getPost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const board_id = Number(req.params.board_id);
  const user_type = req.headers["x-user-type"];
  const comment_page = Math.max(1, Number(req.query.comment_page) || 1);
  const comment_limit = Math.max(1, Number(req.query.comment_limit) || 10);

  try {
    const { post, images, comments, comment_total } =
      await boardService.getPost({
        post_id,
        board_id,
        user_type,
        comment_page,
        comment_limit,
      });

    // 이미지 url 조합
    const host = `${req.protocol}://${req.get("host")}`;

    res.status(200).json({
      post: {
        post_id: post.post_id,
        board_id: post.board_id,
        user_id: post.user_id,
        author_name: post.author_name,
        title: post.title,
        content: post.content,
        status: post.status,
        created_at: post.created_at,
        updated_at: post.updated_at,
        images: post.images.map((img) => ({
          image_id: img.image_id,
          image_url: `${host}/uploads/${img.image_url}`,
        })),
        comments,
        comment_pagination: {
          total: comment_total,
          page: comment_page,
          limit: comment_limit,
          total_pages: Math.ceil(comment_total / comment_limit),
        },
      },
    });
  } catch (err) {
    console.error("게시글 상세 조회 실패:", err);
    res.status(err.status || 500).json({
      error: err.message || "게시글 상세 조회 중 오류가 발생했습니다.",
    });
  }
};

// 게시글 수정
exports.updatePost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_id = req.user.user_id;
  const user_type = req.user.type;
  const { title, content, removed_image_ids } = req.body;
  const files = req.files;

  if (!title || !content) {
    return res.status(400).json({ error: "title, content는 필수입니다." });
  }

  try {
    await boardService.updatePost({
      post_id,
      user_id,
      user_type,
      title,
      content,
      removed_image_ids,
      files,
    });
    res.status(200).json({ message: "게시글이 수정되었습니다." });
  } catch (err) {
    console.error("게시글 수정 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "게시글 수정 중 오류가 발생했습니다." });
  }
};

// 게시글 삭제
exports.deletePost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_id = req.user.user_id;
  const user_type = req.user.type;

  try {
    await boardService.deletePost({ post_id, user_id, user_type });
    res.status(200).json({ message: "게시글이 삭제되었습니다." });
  } catch (err) {
    console.error("게시글 삭제 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "게시글 삭제 중 오류가 발생했습니다." });
  }
};

// 댓글 작성
exports.createComment = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const board_id = Number(req.params.board_id);
  if (isNaN(board_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시판 ID입니다." });
  }
  const user_id = req.user.user_id;
  const { content, parent_comment_id } = req.body;

  if (!content) {
    return res.status(400).json({ error: "content는 필수입니다." });
  }

  try {
    const newComment = await boardService.createComment({
      post_id,
      board_id,
      user_id,
      content,
      parent_comment_id,
    });
    res.status(201).json({
      comment: {
        comment_id: newComment.comment_id,
        post_id: newComment.post_id,
        user_id: newComment.user_id,
        author_name: newComment.author_name,
        content: newComment.content,
        parent_comment_id: newComment.parent_comment_id,
        status: newComment.status,
        created_at: newComment.created_at,
        updated_at: newComment.updated_at,
      },
    });
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "댓글 작성 중 오류가 발생했습니다." });
  }
};

// 댓글 수정
exports.updateComment = async (req, res) => {
  const comment_id = Number(req.params.comment_id);
  if (isNaN(comment_id)) {
    return res.status(400).json({ error: "유효하지 않은 댓글 ID입니다." });
  }

  const user_id = req.user.user_id;
  const user_type = req.user.type;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "content는 필수입니다." });
  }

  try {
    await boardService.updateComment({
      comment_id,
      user_id,
      user_type,
      content,
    });
    res.status(200).json({ message: "댓글이 수정되었습니다." });
  } catch (err) {
    console.error("댓글 수정 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "댓글 수정 중 오류가 발생했습니다." });
  }
};

// 댓글 삭제
exports.deleteComment = async (req, res) => {
  const comment_id = Number(req.params.comment_id);
  if (isNaN(comment_id)) {
    return res.status(400).json({ error: "유효하지 않은 댓글 ID입니다." });
  }

  const user_id = req.user.user_id;
  const user_type = req.user.type;

  try {
    await boardService.deleteComment({ comment_id, user_id, user_type });
    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (err) {
    console.error("댓글 삭제 실패:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "댓글 삭제 중 오류가 발생했습니다." });
  }
};

// 게시판 개설 신청
exports.createBoardRequest = async (req, res) => {
  const user_id = req.user.user_id;
  const user_type = req.user.type;
  const {
    requested_board_name,
    requested_board_type,
    board_audience,
    request_reason,
  } = req.body;

  if (
    !requested_board_name ||
    !requested_board_type ||
    !board_audience ||
    !request_reason
  ) {
    return res.status(400).json({
      error:
        "requested_board_name, requested_board_type, board_audience, request_reason은 필수입니다.",
    });
  }

  try {
    const newRequest = await boardService.createBoardRequest({
      user_id,
      user_type,
      requested_board_name,
      requested_board_type,
      board_audience,
      request_reason,
    });
    res.status(201).json({ board_request: newRequest });
  } catch (err) {
    console.error("게시판 개설 신청 실패:", err);
    res.status(err.status || 500).json({
      error: err.message || "게시판 개설 신청 중 오류가 발생했습니다.",
    });
  }
};

// 게시판 개설 신청 목록 조회 (관리자)
exports.getBoardRequestList = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  try {
    const { requests, total } = await boardService.getBoardRequestList({
      page,
      limit,
    });
    res.status(200).json({
      board_requests: requests,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("게시판 개설 신청 목록 조회 실패:", err);
    res.status(err.status || 500).json({
      error:
        err.message || "게시판 개설 신청 목록 조회 중 오류가 발생했습니다.",
    });
  }
};

// 게시판 개설 승인/거절 (관리자)
exports.updateBoardRequestStatus = async (req, res) => {
  const request_id = Number(req.params.request_id);
  if (isNaN(request_id)) {
    return res.status(400).json({ error: "유효하지 않은 신청 ID입니다." });
  }

  const { request_status } = req.body;

  if (!request_status) {
    return res.status(400).json({ error: "request_status는 필수입니다." });
  }

  if (!["approved", "rejected"].includes(request_status)) {
    return res
      .status(400)
      .json({ error: "request_status는 approved 또는 rejected여야 합니다." });
  }

  try {
    await boardService.updateBoardRequestStatus({ request_id, request_status });
    res.status(200).json({
      message: `게시판 개설 신청이 ${request_status === "approved" ? "승인" : "거절"}되었습니다.`,
    });
  } catch (err) {
    if (err.message === "ALREADY_PROCESSED") {
      return res.status(400).json({ error: "이미 처리된 신청입니다." });
    }
    console.error("게시판 개설 승인/거절 실패:", err);
    res.status(err.status || 500).json({
      error: err.message || "게시판 개설 승인/거절 중 오류가 발생했습니다.",
    });
  }
};
