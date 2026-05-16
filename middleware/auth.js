// Gateway 헤더 기반 인증
exports.isLoggedIn = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  req.user = {
    user_id: Number(req.headers['x-user-id']),
    type:    req.headers['x-user-type'],
  };
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.headers['x-user-type'] !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
};
