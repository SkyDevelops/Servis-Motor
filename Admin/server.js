const app = require("./app");

const port = process.env.ADMIN_PORT || 3001;

app.listen(port, () => {
  console.log(`SiMontir Admin berjalan di http://localhost:${port}`);
});
