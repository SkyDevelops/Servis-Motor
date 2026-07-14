const { supabase } = require("../config/supabase");

async function getDailyReport(tanggal) {

    const { data, error } = await supabase
        .from("transaksi_kasir")
        .select(`
            *,
            pembayaran(*),
            detail_transaksi_kasir(*)
        `)
        .gte("created_at", `${tanggal}T00:00:00`)
        .lte("created_at", `${tanggal}T23:59:59`);

    if (error) {
        throw error;
    }

    let total = 0;

    data.forEach(item => {
        total += Number(item.total || 0);
    });

    return {
        tanggal,
        jumlah_transaksi: data.length,
        total_pendapatan: total,
        transaksi: data
    };
}


module.exports = {
    getDailyReport
};