const supabase = require("../config/supabase");
const cashierService = require("../services/cashierService");
const { sendNotification } = require("../services/notificationService");

const VALID_RESERVATION_STATUSES = ["pending", "cancel", "onProgress", "success"];

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
        countTable("profiles"),
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
      .from("profiles")
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
    const { data: resData, error: resError } = await supabase
      .from("reservasi")
      .select("*, kendaraan(merk,tipe,nomor_polisi)")
      .order("created_at", { ascending: false });

    if (resError) throw resError;

    // Fetch offline transactions
    const { data: offlineTrx, error: trxError } = await supabase
      .from("transaksi_kasir")
      .select("*")
      .is("reservasi_id", null)
      .order("created_at", { ascending: false });

    if (trxError) throw trxError;

    const formattedOffline = offlineTrx.map(trx => {
      let plat = "-";
      let merk = "Kendaraan Offline";
      const match = trx.catatan?.match(/\[Kendaraan Langsung: (.*?) - (.*?)\]/);
      if (match) {
        plat = match[1];
        merk = match[2];
      }

      return {
        id: trx.id,
        user_id: null,
        kendaraan_id: null,
        tanggal_servis: new Date(trx.created_at).toISOString().slice(0, 10),
        jam_servis: new Date(trx.created_at).toISOString().slice(11, 16),
        jenis_servis: "Transaksi Kasir (Langsung)",
        keluhan: trx.catatan || "-",
        status: trx.status === "dibayar" ? "success" : "pending",
        created_at: trx.created_at,
        kendaraan: {
          merk: merk,
          tipe: "",
          nomor_polisi: plat
        },
        profiles: {
          nama: "Pelanggan Offline"
        },
        tipe_reservasi: "offline"
      };
    });

    const userIds = [...new Set(resData.map((reservation) => reservation.user_id).filter(Boolean))];
    let profilesById = new Map();
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,nama,email")
        .in("id", userIds);

      if (profileError) throw profileError;
      profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    }

    const formattedOnline = resData.map((reservation) => ({
      ...reservation,
      profiles: profilesById.get(reservation.user_id) || null,
      tipe_reservasi: "online"
    }));

    const combined = [...formattedOnline, ...formattedOffline].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(combined);
  } catch (error) {
    next(error);
  }
};

const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!VALID_RESERVATION_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status reservasi tidak valid" });
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

const cashierData = async (req, res, next) => {
  try {
    const data = await cashierService.loadCashierData();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createCashierTransaction = async (req, res, next) => {
  try {
    const data = await cashierService.createCashierTransaction(req.user.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dashboard,
  users,
  reservations,
  updateReservationStatus,
  cashierData,
  createCashierTransaction
};
