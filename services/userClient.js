const axios = require("axios"); // http 요청 라이브러리

const USER_SVC_URL = process.env.USER_SERVICE_URL || "http://user-svc:8081";

exports.getUserById = async (userId) => {
  const response = await axios.get(`${USER_SVC_URL}/internal/users/${userId}`);
  return response.data;
};
