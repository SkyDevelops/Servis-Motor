const supabase = require("../config/supabase");

const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId);

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return null;
  }
  return data[0];
};

const updateProfile = async (userId, payload) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const register = async ({ nama, email, password, nomor_handphone, provinsi, kota_domisili }) => {
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
        role: "user",
        nomor_handphone,
        provinsi,
        kota_domisili
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
  getProfile,
  updateProfile,
  register,
  login,
  logout
};
