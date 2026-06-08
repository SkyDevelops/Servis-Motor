const supabase = require("../config/supabase");

const recommendService = (kilometer = 0) => {
  const km = Number(kilometer);
  if (km < 5000) return "Servis Ringan";
  if (km < 10000) return "Ganti Oli";
  if (km < 20000) return "Tune Up";
  return "Servis Besar";
};

const listReservations = async (userId) => {
  const { data, error } = await supabase
    .from("reservasi")
    .select("*, kendaraan(*)")
    .eq("user_id", userId)
    .order("tanggal_servis", { ascending: false });

  if (error) throw error;
  return data;
};

const createReservation = async (userId, payload) => {
  const { kendaraan_id, tanggal_servis, jam_servis } = payload;

  const { count, error: slotError } = await supabase
    .from("reservasi")
    .select("*", { count: "exact", head: true })
    .eq("tanggal_servis", tanggal_servis)
    .eq("jam_servis", jam_servis)
    .in("status", ["Pending", "Dikonfirmasi"]);

  if (slotError) throw slotError;
  if (count > 0) {
    const error = new Error("Slot servis sudah terisi");
    error.status = 409;
    throw error;
  }

  const { data, error } = await supabase
    .from("reservasi")
    .insert([
      {
        ...payload,
        kendaraan_id,
        user_id: userId,
        status: "Pending"
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateReservation = async (userId, id, payload) => {
  const { data, error } = await supabase
    .from("reservasi")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteReservation = async (userId, id) => {
  const { error } = await supabase
    .from("reservasi")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return { message: "Reservasi berhasil dihapus" };
};

module.exports = {
  recommendService,
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation
};
