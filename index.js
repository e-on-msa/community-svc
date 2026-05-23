require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 8083;
const { connect: connectRabbitMQ } = require("./services/rabbitmq");

sequelize
  .sync({ alter: false }) // { alter: true }는 개발 중에만 사용, 운영에서는 false로 설정
  .then(() => {
    console.log("DB 연결 성공");
    app.listen(PORT, () => {
      console.log(`community-svc listening on :${PORT}`);
    });
    connectRabbitMQ(); // RabbitMQ 연결
  })
  .catch((err) => {
    console.error("DB 연결 실패", err);
    process.exit(1);
  });
