const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const { nama, email, password } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ message: "Nama, email, dan password wajib diisi" });
    }

    const data = await authService.register({ nama, email, password });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email dan password wajib diisi" });
    }

    const data = await authService.login({ email, password });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const data = await authService.logout();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout
};
