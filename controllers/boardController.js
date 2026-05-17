const { Post, PostImage, Board, sequelize } = require("../models");
const userClient = require("../services/userClient");
const path = require("path");

// 게시글 작성
exports.createPost = async (req, res) => {
  const boardId = Number(req.params.board_id); // URL 파라미터는 문자열이므로 숫자로 변환
  const user_id = req.user.user_id;
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
          board_id: boardId, // URL 파라미터는 문자열이므로 숫자로 변환
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
  const boardId = Number(req.params.board_id); // URL 파라미터는 문자열이므로 숫자로 변환
  if (isNaN(boardId)) {
    return res.status(400).json({ error: "유효하지 않은 게시판 ID입니다." });
  }
  const userId = req.headers["x-user-id"];
  const userType = req.headers["x-user-type"];

  // 페이징 처리
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // 게시판 존재 여부 + 접근 권한은 checkBoardAccess 미들웨어에서 이미 체크했으므로 여기서는 생략
    // 게시글 목록 조회
    // admin이면 HIDDEN 포함, 일반 사용자면 ACTIVE만
    const whereClause = {
      board_id: boardId,
      ...(userType !== "admin" && { status: "ACTIVE" }),
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

    res
      .status(200)
      .json({
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

// 게시판 목록 조회
exports.getBoardList = async (req, res) => {
  res.json({ message: "getBoardList - TODO" });
};
