const axios = require("axios"); // http 요청 라이브러리

const USER_SVC_URL = process.env.USER_SVC_URL || "http://localhost:8082";

exports.getUserById = async (userId) => {
  // TODO: user-svc랑 연동 하고나서 아래 주석 해제하기
  //   const response = await axios.get(`${USER_SVC_URL}/internal/users/${userId}`);
  //   return response.data;

  // 임시: user-svc 연동 전까지는 하드코딩된 데이터 반환
  return {
    user_id: userId,
    name: "김이안-테스트",
  };
};
