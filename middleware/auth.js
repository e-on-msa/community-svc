// Gateway 헤더 기반 인증
exports.isLoggedIn = (req, res, next) => {
  const rawId = req.headers["x-user-id"];

  if (!rawId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const userId = Number(rawId);

  if (isNaN(userId)) {
    return res.status(401).json({ message: "유효하지 않은 사용자 ID입니다." });
  }

  req.user = {
    user_id: userId,
    type: req.headers["x-user-type"],
  };

  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.user?.type !== "admin") {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }
  next();
};
