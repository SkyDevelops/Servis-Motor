require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("../src/routes/authRoutes");
const vehicleRoutes = require("../src/routes/vehicleRoutes");
const reservationRoutes = require("../src/routes/reservationRoutes");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "..", "src", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.get("/reservasi", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reservasi.html"));
});

app.get("/histori", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "histori.html"));
});

app.get("/profil", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "profil.html"));
});

app.get("/health", (req, res) => {
  res.json({ app: "SiMontir User", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/reservations", reservationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint user tidak ditemukan" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Terjadi kesalahan server user"
  });
});

module.exports = app;
