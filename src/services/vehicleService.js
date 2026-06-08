const supabase = require("../config/supabase");

const listVehicles = async (userId) => {
  const { data, error } = await supabase
    .from("kendaraan")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const createVehicle = async (userId, payload) => {
  const { data, error } = await supabase
    .from("kendaraan")
    .insert([{ ...payload, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateVehicle = async (userId, id, payload) => {
  const { data, error } = await supabase
    .from("kendaraan")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteVehicle = async (userId, id) => {
  const { error } = await supabase
    .from("kendaraan")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return { message: "Kendaraan berhasil dihapus" };
};

module.exports = {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
