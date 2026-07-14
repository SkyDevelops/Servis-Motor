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

    if (trxError) trxError;

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
        profiles: { // Changed from users to profiles
          nama: "Pelanggan Offline"
        },
        tipe_reservasi: "offline"
      };
    });

    const userIds = [...new Set(resData.map((reservation) => reservation.user_id).filter(Boolean))];
    let profilesById = new Map();
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profileError } = await supabase
        .from("profiles") // Changed from users to profiles
        .select("id,nama,email")
        .in("id", userIds);

      if (profileError) throw profileError;
      profilesById = new Map(profilesData.map((profile) => [profile.id, profile]));
    }

    const formattedOnline = resData.map((reservation) => ({
      ...reservation,
      profiles: profilesById.get(reservation.user_id) || null, // Changed from users to profiles
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
      .select("*, kendaraan_id")
      .single();

    if (error) throw error;

    // Reset service reminder if status becomes 'success'
    if (status === 'success') {
      await supabase
        .from("kendaraan")
        .update({ tanggal_servis_terakhir: new Date().toISOString() })
        .eq("id", data.kendaraan_id);
    }

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

const dailyFinancialReport = async (req, res, next) => {
  try {
    const tanggal =
      req.query.tanggal || new Date().toISOString().slice(0, 10);

    const { data: transaksi, error } = await supabase
      .from("transaksi_kasir")
      .select("*")
      .gte("created_at", `${tanggal}T00:00:00`)
      .lte("created_at", `${tanggal}T23:59:59`)
      .order("created_at", { ascending: false });


    if (error) throw error;


    let totalPendapatan = 0;


    transaksi.forEach((trx) => {
      totalPendapatan += Number(
        trx.total ||
        trx.total_harga ||
        0
      );
    });


    res.json({
      tanggal,
      jumlah_transaksi: transaksi.length,
      total_pendapatan: totalPendapatan,
      transaksi
    });


  } catch (error) {
    next(error);
  }
};

const financialReport = async (req, res, next) => {
  try {
    const {
      periode = "harian",
      tanggal,
      bulan,
      tahun
    } = req.query;


    const now = new Date();

    let startDate;
    let endDate;


    // =====================
    // LAPORAN HARIAN
    // =====================
    if (periode === "harian") {

      const date =
        tanggal ||
        now.toISOString().slice(0,10);


      startDate =
        `${date}T00:00:00`;

      endDate =
        `${date}T23:59:59`;

    }



    // =====================
    // LAPORAN BULANAN
    // =====================
    if (periode === "bulanan") {

      const year =
        tahun ||
        now.getFullYear();


      const month =
        bulan ||
        now.getMonth()+1;


      startDate =
        `${year}-${String(month).padStart(2,"0")}-01T00:00:00`;


      const lastDay =
        new Date(
          year,
          month,
          0
        ).getDate();


      endDate =
        `${year}-${String(month).padStart(2,"0")}-${lastDay}T23:59:59`;

    }




    // =====================
    // LAPORAN TAHUNAN
    // =====================
    if (periode === "tahunan") {

      const year =
        tahun ||
        now.getFullYear();


      startDate =
        `${year}-01-01T00:00:00`;


      endDate =
        `${year}-12-31T23:59:59`;

    }




    const {
      data: transaksi,
      error
    } = await supabase
      .from("transaksi_kasir")
      .select("*")
      .gte(
        "created_at",
        startDate
      )
      .lte(
        "created_at",
        endDate
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      );



    if(error)
      throw error;



    let totalMasuk = 0;



    transaksi.forEach((trx)=>{

      totalMasuk += Number(
        trx.total || 0
      );

    });



    res.json({

      periode,

      mulai:startDate,

      selesai:endDate,

      jumlah_transaksi:
        transaksi.length,


      total_masuk:
        totalMasuk,


      transaksi

    });



  } catch(error){

    next(error);

  }

};

module.exports = {
  dashboard,
  users,
  reservations,
  updateReservationStatus,
  cashierData,
  createCashierTransaction,
  dailyFinancialReport,
  financialReport
};

