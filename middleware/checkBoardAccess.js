const { Board } = require("../models");

module.exports = async (req, res, next) => {
  const board_id = Number(req.params.board_id);
  const userId = req.headers["x-user-id"];
  const userType = req.headers["x-user-type"];

  try {
    // 1. 게시판 존재 여부 확인
    const board = await Board.findByPk(board_id);
    if (!board) {
      return res.status(404).json({ error: "게시판을 찾을 수 없습니다." });
    }

    // 2. 접근 권한 체크
    if (board.board_audience !== "all") {
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
      }
      if (userType !== "admin" && board.board_audience !== userType) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
    }

    // 3. board 정보를 다음 미들웨어에서 쓸 수 있도록 저장
    req.board = board;
    next();
  } catch (err) {
    console.error("게시판 접근 권한 체크 실패:", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};
