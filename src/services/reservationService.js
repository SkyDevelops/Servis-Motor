const supabase = require("../config/supabase");

const ACTIVE_STATUSES = ["pending", "onProgress"];

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
    .in("status", ACTIVE_STATUSES);

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
        status: "pending"
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

const getReservationById = async (userId, id) => {
  const { data, error } = await supabase
    .from("reservasi")
    .select(`
      *,
      kendaraan(merk, tipe, nomor_polisi, tahun, kilometer),
      profiles(nama, email),
      transaksi_kasir(
        *,
        pembayaran(*),
        detail_transaksi_kasir(
          *,
          service_catalog(nama, harga, estimasi_menit),
          stok_barang(nama, harga_jual)
        )
      )
    `)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
};

module.exports = {
  recommendService,
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  getReservationById
};