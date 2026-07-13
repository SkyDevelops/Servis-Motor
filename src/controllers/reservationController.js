const reservationService = require("../services/reservationService");
const { sendNotification } = require("../services/notificationService");

const list = async (req, res, next) => {
  try {
    const data = await reservationService.listReservations(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { kendaraan_id, tanggal_servis, jam_servis, jenis_servis, keluhan } = req.body;

    if (!kendaraan_id || !tanggal_servis || !jam_servis || !jenis_servis) {
      return res.status(400).json({
        message: "Kendaraan, tanggal, jam, dan jenis servis wajib diisi"
      });
    }

    const data = await reservationService.createReservation(req.user.id, {
      kendaraan_id,
      tanggal_servis,
      jam_servis,
      jenis_servis,
      keluhan
    });

    await sendNotification(req.user.id, "Reservasi berhasil dibuat");
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await reservationService.updateReservation(req.user.id, req.params.id, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await reservationService.deleteReservation(req.user.id, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await reservationService.getReservationById(req.user.id, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const recommend = (req, res) => {
  const rekomendasi = reservationService.recommendService(req.body.kilometer);
  res.json({ rekomendasi });
};

module.exports = {
  list,
  create,
  update,
  remove,
  getById,
  recommend
};
