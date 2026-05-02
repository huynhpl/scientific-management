require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { init } = require('./database');
const app = require('./app');

const PORT = process.env.PORT || 3001;

init().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend server chạy tại http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Không thể khởi động database:', err);
  process.exit(1);
});
