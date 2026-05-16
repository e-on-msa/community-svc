const { Post, PostImage, sequelize } = require("../models");
const userClient = require("../services/userClient");
const path = require("path");

exports.createPost = async (req, res) => {
  const { board_id } = req.params;
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
          board_id: Number(board_id), // URL 파라미터는 문자열이므로 숫자로 변환
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

// TODO: 게시글 목록 조회
exports.getBoardList = async (req, res) => {
  res.json({ message: "getBoardList - TODO" });
};
