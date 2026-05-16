const express = require('express');
const router  = express.Router();
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const board   = require('../controllers/boardController');

// ── 읽기 (인증 불필요) ──────────────
router.get('/',                        board.getBoardList);

// TODO: 나머지 라우트 추가

module.exports = router;
