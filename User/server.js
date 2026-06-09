const app = require("./app");

const port = process.env.USER_PORT || process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`SiMontir User berjalan di http://localhost:${port}`);
});
