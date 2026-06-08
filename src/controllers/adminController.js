const supabase = require("../config/supabase");
const { sendNotification } = require("../services/notificationService");

const countTable = async (table, filterToday = false) => {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (filterToday) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.eq("tanggal_servis", today);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const dashboard = async (req, res, next) => {
  try {
    const [totalPelanggan, totalKendaraan, totalReservasi, reservasiHariIni] =
      await Promise.all([
        countTable("users"),
        countTable("kendaraan"),
        countTable("reservasi"),
        countTable("reservasi", true)
      ]);

    res.json({
      total_pelanggan: totalPelanggan,
      total_kendaraan: totalKendaraan,
      total_reservasi: totalReservasi,
      reservasi_hari_ini: reservasiHariIni
    });
  } catch (error) {
    next(error);
  }
};

const users = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const reservations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("reservasi")
      .select("*, users(nama,email), kendaraan(merk,tipe,nomor_polisi)")
      .order("tanggal_servis", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status wajib diisi" });
    }

    const { data, error } = await supabase
      .from("reservasi")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    await sendNotification(data.user_id, `Status reservasi menjadi ${status}`);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dashboard,
  users,
  reservations,
  updateReservationStatus
};
