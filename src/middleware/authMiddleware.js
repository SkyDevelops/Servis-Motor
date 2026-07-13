const supabase = require("../config/supabase");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "Token tidak valid" });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id,nama,email,role")
    .eq("id", data.user.id)
    .single();

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || "user",
    nama: profile?.nama || data.user.user_metadata?.nama || ""
  };

  next();
};

module.exports = authMiddleware;
