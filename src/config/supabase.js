const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || supabaseAnonKey;

if (!supabaseUrl || !supabaseServerKey) {
  console.warn("SUPABASE_URL dan SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY wajib diisi.");
}

const createMissingConfigClient = () => {
  const error = new Error("Konfigurasi Supabase belum lengkap. Isi SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY di file .env.");
  error.status = 503;

  const fail = () => {
    throw error;
  };

  return {
    auth: {
      signUp: fail,
      signInWithPassword: fail,
      signOut: fail,
      getUser: fail
    },
    from: fail
  };
};

const supabase =
  supabaseUrl && supabaseServerKey
    ? createClient(supabaseUrl, supabaseServerKey)
    : createMissingConfigClient();

module.exports = supabase;
