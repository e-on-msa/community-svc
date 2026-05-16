require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 8083;

sequelize.sync({ alter: false })
  .then(() => {
    console.log('DB 연결 성공');
    app.listen(PORT, () => {
      console.log(`community-svc listening on :${PORT}`);
    });
  })
  .catch(err => {
    console.error('DB 연결 실패', err);
    process.exit(1);
  });
