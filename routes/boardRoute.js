const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const board = require("../controllers/boardController");

// 라우트 추가 시 "고정 경로 먼저" -> "동적 경로 나중에"

// ── 읽기 (비로그인 허용) ──────────────
router.get("/", board.getBoardList); // 게시판 목록 조회
router.get("/:board_id/posts", board.getPostList); // 게시글 목록 조회

// TODO: 나머지 라우트 추가

// ── 쓰기 (로그인 필요) ────────────────
router.post(
  "/:board_id/posts",
  isLoggedIn,
  upload.array("images", 5),
  board.createPost,
);

module.exports = router;
