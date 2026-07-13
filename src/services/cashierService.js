const supabase = require("../config/supabase");

const generateTransactionNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = String(now.getTime()).slice(-6);
  return `TRX-${date}-${time}`;
};

const toNumber = (value) => Number(value || 0);

const loadCashierData = async () => {
  const [reservationsResult, stockResult, servicesResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("reservasi")
        .select("*, kendaraan(merk,tipe,nomor_polisi)")
        .in("status", ["pending", "onProgress", "success"])
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("stok_barang")
        .select("id,nama,kode_barang,stok,harga_jual,satuan")
        .order("nama", { ascending: true }),
      supabase
        .from("service_catalog")
        .select("id,nama,harga,estimasi_menit,aktif")
        .eq("aktif", true)
        .order("nama", { ascending: true }),
      supabase
        .from("transaksi_kasir")
        .select("*, pembayaran(metode,nominal,kembalian,status)")
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

  if (reservationsResult.error) throw reservationsResult.error;
  if (stockResult.error) throw stockResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const reservations = reservationsResult.data || [];
  const userIds = [...new Set(reservations.map((reservation) => reservation.user_id).filter(Boolean))];
  let usersById = new Map();

  if (userIds.length > 0) {
    const { data: usersData, error: userError } = await supabase
      .from("users")
      .select("id,nama,email")
      .in("id", userIds);

    if (userError) throw userError;
    usersById = new Map((usersData || []).map((user) => [user.id, user]));
  }

  return {
    reservations: reservations.map((reservation) => ({
      ...reservation,
      users: usersById.get(reservation.user_id) || null
    })),
    stock: stockResult.data || [],
    services: servicesResult.data || [],
    transactions: transactionsResult.data || []
  };
};

const validateItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Minimal tambah satu item transaksi");
    error.status = 400;
    throw error;
  }

  return items.map((item) => {
    const qty = Math.max(1, toNumber(item.qty));
    const harga = Math.max(0, toNumber(item.harga));

    if (!item.nama_item || !item.tipe_item) {
      const error = new Error("Nama dan tipe item wajib diisi");
      error.status = 400;
      throw error;
    }

    return {
      stok_barang_id: item.tipe_item === "barang" ? item.stok_barang_id || null : null,
      service_id: item.tipe_item === "service" ? item.service_id || null : null,
      tipe_item: item.tipe_item,
      nama_item: item.nama_item,
      qty,
      harga
    };
  });
};

const reduceStock = async ({ transactionId, items, adminId }) => {
  const stockItems = items.filter((item) => item.tipe_item === "barang" && item.stok_barang_id);

  for (const item of stockItems) {
    const { data: stock, error: stockError } = await supabase
      .from("stok_barang")
      .select("id,stok")
      .eq("id", item.stok_barang_id)
      .single();

    if (stockError) throw stockError;
    if (!stock || stock.stok < item.qty) {
      const error = new Error(`Stok ${item.nama_item} tidak cukup`);
      error.status = 409;
      throw error;
    }

    const nextStock = stock.stok - item.qty;
    const { error: updateError } = await supabase
      .from("stok_barang")
      .update({ stok: nextStock })
      .eq("id", item.stok_barang_id);

    if (updateError) throw updateError;

    const { error: mutationError } = await supabase
      .from("stock_mutation")
      .insert([
        {
          stok_barang_id: item.stok_barang_id,
          tipe: "keluar",
          qty: item.qty,
          stok_sebelum: stock.stok,
          stok_sesudah: nextStock,
          referensi_tabel: "transaksi_kasir",
          referensi_id: transactionId,
          catatan: `Penjualan kasir ${item.nama_item}`,
          created_by: adminId
        }
      ]);

    if (mutationError) throw mutationError;
  }
};

const createCashierTransaction = async (adminId, payload) => {
  const items = validateItems(payload.items);
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.harga, 0);
  const diskon = Math.max(0, toNumber(payload.diskon));
  const pajak = Math.max(0, toNumber(payload.pajak));
  const total = Math.max(0, subtotal - diskon + pajak);
  const nominalBayar = Math.max(0, toNumber(payload.nominal_bayar));
  const isPaid = nominalBayar >= total;
  const status = isPaid ? "dibayar" : "draft";

  const { data: transaction, error: transactionError } = await supabase
    .from("transaksi_kasir")
    .insert([
      {
        nomor_transaksi: generateTransactionNumber(),
        user_id: payload.user_id || null,
        reservasi_id: payload.reservasi_id || null,
        mekanik_id: payload.mekanik_id || null,
        subtotal,
        diskon,
        pajak,
        total,
        status,
        catatan: payload.catatan || null
      }
    ])
    .select()
    .single();

  if (transactionError) throw transactionError;

  const details = items.map((item) => ({
    transaksi_id: transaction.id,
    stok_barang_id: item.stok_barang_id,
    service_id: item.service_id,
    tipe_item: item.tipe_item,
    nama_item: item.nama_item,
    qty: item.qty,
    harga: item.harga
  }));

  const { error: detailError } = await supabase
    .from("detail_transaksi_kasir")
    .insert(details);

  if (detailError) throw detailError;

  if (nominalBayar > 0) {
    const { error: paymentError } = await supabase
      .from("pembayaran")
      .insert([
        {
          transaksi_id: transaction.id,
          metode: payload.metode_bayar || "tunai",
          nominal: nominalBayar,
          kembalian: Math.max(0, nominalBayar - total),
          status: isPaid ? "dibayar" : "pending",
          dibayar_at: isPaid ? new Date().toISOString() : null
        }
      ]);

    if (paymentError) throw paymentError;
  }

  if (isPaid) {
    await reduceStock({ transactionId: transaction.id, items, adminId });

    if (payload.reservasi_id && payload.selesaikan_reservasi) {
      const { error: reservationError } = await supabase
        .from("reservasi")
        .update({ status: "success" })
        .eq("id", payload.reservasi_id);

      if (reservationError) throw reservationError;
    }
  }

  return {
    ...transaction,
    items: details,
    pembayaran: nominalBayar > 0
      ? {
          metode: payload.metode_bayar || "tunai",
          nominal: nominalBayar,
          kembalian: Math.max(0, nominalBayar - total),
          status: isPaid ? "dibayar" : "pending"
        }
      : null
  };
};

module.exports = {
  loadCashierData,
  createCashierTransaction
};
