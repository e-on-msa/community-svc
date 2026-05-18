const { Post, PostImage, Board, Comment, sequelize } = require("../models");
const userClient = require("../services/userClient");
const path = require("path");

// 게시글 작성
exports.createPost = async (req, res) => {
  const board_id = Number(req.params.board_id); // URL 파라미터는 문자열이므로 숫자로 변환
  const user_id = req.user.user_id; // 로그인한 사용자 정보는 auth 미들웨어에서 req.user에 담아서 넘겨주도록 되어 있음
  const { title, content } = req.body;
  const files = req.files;

  if (!title || !content) {
    return res.status(400).json({ error: "title, content는 필수입니다." });
  }

  try {
    // 1. user-svc에서 author_name 조회
    const user = await userClient.getUserById(user_id);
    if (!user) {
      return res.status(404).json({ error: "사용자 정보를 찾을 수 없습니다." });
    }
    const author_name = user.name;

    // 2. 게시글 저장 + 이미지 저장 (트랜잭션으로 묶기)
    const newPost = await sequelize.transaction(async (t) => {
      // 게시글 저장
      const post = await Post.create(
        {
          board_id: board_id, // URL 파라미터는 문자열이므로 숫자로 변환
          user_id,
          author_name,
          title,
          content,
          status: "ACTIVE",
        },
        { transaction: t },
      );

      // 이미지 저장
      if (files?.length) {
        const bulk = files.map((f) => ({
          post_id: post.post_id,
          image_url: f.filename, // 전체 URL 대신 파일명만 저장 -> 게시글 조회 시 응답할 때 프론트에서 `${process.env.BACKEND_URL}/uploads/${f.filename}` 형태로 URL 조합해서 사용하도록 변경 (getPost 구현할 때 이렇게 하면 된다.)
        }));
        await PostImage.bulkCreate(bulk, { transaction: t });
      }

      return post;
    });

    res.status(201).json({ post: newPost });
  } catch (err) {
    console.error("게시글 작성 실패:", err);
    res.status(500).json({ error: "게시글 작성 중 오류가 발생했습니다." });
  }
};

// 게시글 목록 조회
exports.getPostList = async (req, res) => {
  const board_id = Number(req.params.board_id); // URL 파라미터는 문자열이므로 숫자로 변환
  if (isNaN(board_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시판 ID입니다." });
  }
  const user_type = req.headers["x-user-type"]; // 로그인 여부는 checkBoardAccess 미들웨어에서 이미 체크했으므로 여기서는 user_type만 확인

  // 페이징 처리
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // 게시판 존재 여부 + 접근 권한은 checkBoardAccess 미들웨어에서 이미 체크했으므로 여기서는 생략
    // 게시글 목록 조회
    // admin이면 HIDDEN 포함, 일반 사용자면 ACTIVE만
    const whereClause = {
      board_id: board_id,
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

    res.status(200).json({
      posts,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("게시글 목록 조회 실패:", err);
    res.status(500).json({ error: "게시글 목록 조회 중 오류가 발생했습니다." });
  }
};

// TODO: 게시판 목록 조회
exports.getBoardList = async (req, res) => {
  res.json({ message: "getBoardList - TODO" });
};

// 게시글 상세 조회 (댓글 목록 포함)
exports.getPost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_type = req.headers["x-user-type"];

  try {
    const post = await Post.findOne({
      where: {
        post_id,
        // admin이면 HIDDEN도 조회 가능
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
        {
          model: Comment,
          where: { parent_comment_id: null }, // 최상위 댓글만
          required: false, // 댓글 없어도 게시글 반환
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
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // 게시판 접근 권한 체크
    const board = await Board.findByPk(post.board_id);
    if (board.board_audience !== "all") {
      if (!user_id) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
      }
      if (user_type !== "admin" && board.board_audience !== user_type) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
    }

    // 이미지 URL 조합
    const host = `${req.protocol}://${req.get("host")}`;
    const images = post.images.map((img) => ({
      image_id: img.image_id,
      image_url: `${host}/uploads/${img.image_url}`,
    }));

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
        images,
        comments: post.Comments,
      },
    });
  } catch (err) {
    console.error("게시글 상세 조회 실패:", err);
    res.status(500).json({ error: "게시글 상세 조회 중 오류가 발생했습니다." });
  }
};

// 게시글 수정
exports.updatePost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_id = req.user.user_id; // 로그인한 사용자 정보는 auth 미들웨어에서 req.user에 담아서 넘겨주도록 되어 있음
  const user_type = req.user.type;
  const { title, content, removed_image_ids } = req.body;
  const files = req.files;

  if (!title || !content) {
    return res.status(400).json({ error: "title, content는 필수입니다." });
  }

  try {
    // 1. 게시글 존재 여부 확인
    const post = await Post.findByPk(post_id);
    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // 2. 권한 체크 (본인 또는 관리자)
    if (post.user_id !== user_id && user_type !== "admin") {
      return res.status(403).json({ error: "수정 권한이 없습니다." });
    }

    // 3. 수정 + 이미지 처리 (트랜잭션)
    await sequelize.transaction(async (t) => {
      // 게시글 수정
      await Post.update(
        { title, content },
        { where: { post_id }, transaction: t },
      );

      // 이미지 삭제
      if (removed_image_ids?.length) {
        await PostImage.destroy({
          where: { image_id: removed_image_ids, post_id: post_id },
          transaction: t,
        });
      }

      // 이미지 추가
      if (files?.length) {
        const bulk = files.map((f) => ({
          post_id,
          image_url: f.filename,
        }));
        await PostImage.bulkCreate(bulk, { transaction: t });
      }
    });

    res.status(200).json({ message: "게시글이 수정되었습니다." });
  } catch (err) {
    console.error("게시글 수정 실패:", err);
    res.status(500).json({ error: "게시글 수정 중 오류가 발생했습니다." });
  }
};

// 게시글 삭제
exports.deletePost = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_id = req.user.user_id; // 로그인한 사용자 정보는 auth 미들웨어에서 req.user에 담아서 넘겨주도록 되어 있음
  const user_type = req.user.type;

  try {
    // 1. 게시글 존재 여부 확인
    const post = await Post.findByPk(post_id);
    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // 2. 권한 체크 (본인 또는 관리자)
    if (post.user_id !== user_id && user_type !== "admin") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    // 3. 게시글 삭제 (PostImage는 CASCADE로 자동 삭제)
    await Post.destroy({ where: { post_id } });

    res.status(200).json({ message: "게시글이 삭제되었습니다." });
  } catch (err) {
    console.error("게시글 삭제 실패:", err);
    res.status(500).json({ error: "게시글 삭제 중 오류가 발생했습니다." });
  }
};

// 댓글 작성
exports.createComment = async (req, res) => {
  const post_id = Number(req.params.post_id);
  if (isNaN(post_id)) {
    return res.status(400).json({ error: "유효하지 않은 게시글 ID입니다." });
  }

  const user_id = req.user.user_id;
  const { content, parent_comment_id } = req.body;

  if (!content) {
    return res.status(400).json({ error: "content는 필수입니다." });
  }

  try {
    // 1. 게시글 존재 여부 확인
    const post = await Post.findByPk(post_id);
    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // 게시글이 해당 게시판 소속인지 확인
    if (post.board_id !== Number(req.params.board_id)) {
      return res
        .status(400)
        .json({ error: "해당 게시판의 게시글이 아닙니다." });
    }

    // 게시글이 숨김 상태면 댓글 작성 불가
    if (post.status === "HIDDEN") {
      return res
        .status(403)
        .json({ error: "숨김 처리된 게시글에는 댓글을 작성할 수 없습니다." });
    }

    // 2. 대댓글인 경우 부모 댓글 존재 여부 확인
    if (parent_comment_id) {
      const parentComment = await Comment.findByPk(parent_comment_id);
      if (!parentComment) {
        return res.status(404).json({ error: "부모 댓글을 찾을 수 없습니다." });
      }
      // 부모 댓글이 같은 게시글의 댓글인지 확인
      if (parentComment.post_id !== post_id) {
        return res
          .status(400)
          .json({ error: "부모 댓글이 해당 게시글의 댓글이 아닙니다." });
      }
    }

    // 3. user-svc에서 author_name 조회
    const user = await userClient.getUserById(user_id);
    if (!user) {
      return res.status(404).json({ error: "사용자 정보를 찾을 수 없습니다." });
    }
    const author_name = user.name;

    // 4. 댓글 저장
    const newComment = await Comment.create({
      post_id,
      user_id,
      author_name,
      content,
      parent_comment_id: parent_comment_id || null,
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
    res.status(500).json({ error: "댓글 작성 중 오류가 발생했습니다." });
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
    // 1. 댓글 존재 여부 확인
    const comment = await Comment.findByPk(comment_id);
    if (!comment) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    // 2. 권한 체크 (본인 또는 관리자)
    if (comment.user_id !== user_id && user_type !== "admin") {
      return res.status(403).json({ error: "수정 권한이 없습니다." });
    }

    // 3. 댓글 수정
    await Comment.update({ content }, { where: { comment_id } });

    res.status(200).json({ message: "댓글이 수정되었습니다." });
  } catch (err) {
    console.error("댓글 수정 실패:", err);
    res.status(500).json({ error: "댓글 수정 중 오류가 발생했습니다." });
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
    // 1. 댓글 존재 여부 확인
    const comment = await Comment.findByPk(comment_id);
    if (!comment) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    // 2. 권한 체크 (본인 또는 관리자)
    if (comment.user_id !== user_id && user_type !== "admin") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    // 3. 댓글 삭제 (대댓글은 CASCADE로 자동 삭제)
    await Comment.destroy({ where: { comment_id } });

    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (err) {
    console.error("댓글 삭제 실패:", err);
    res.status(500).json({ error: "댓글 삭제 중 오류가 발생했습니다." });
  }
};
