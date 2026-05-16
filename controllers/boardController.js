const { Post, PostImage } = require("../models");
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
    const author_name = user.name;

    // 2. 게시글 저장
    const newPost = await Post.create({
      board_id: Number(board_id), // URL 파라미터는 문자열이므로 숫자로 변환
      user_id,
      author_name,
      title,
      content,
      status: "ACTIVE",
    });

    // 3. 이미지 저장
    if (files?.length) {
      const host = `${req.protocol}://${req.get("host")}`;
      const bulk = files.map((f) => ({
        post_id: newPost.post_id,
        image_url: `${host}/uploads/${f.filename}`,
      }));
      await PostImage.bulkCreate(bulk);
    }

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
