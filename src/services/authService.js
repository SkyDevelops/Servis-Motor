const supabase = require("../config/supabase");

const register = async ({ nama, email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nama }
    }
  });

  if (error) throw error;

  const user = data.user;
  if (user) {
    const { error: profileError } = await supabase.from("profiles").upsert([
      {
        id: user.id,
        nama,
        email,
        role: "user"
      }
    ]);

    if (profileError) throw profileError;
  }

  return data;
};

const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return { message: "Logout berhasil" };
};

module.exports = {
  register,
  login,
  logout
};
