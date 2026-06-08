const vehicleService = require("../services/vehicleService");

const list = async (req, res, next) => {
  try {
    const data = await vehicleService.listVehicles(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { merk, tipe, nomor_polisi, tahun, kilometer } = req.body;

    if (!merk || !tipe || !nomor_polisi) {
      return res.status(400).json({ message: "Merk, tipe, dan nomor polisi wajib diisi" });
    }

    const data = await vehicleService.createVehicle(req.user.id, {
      merk,
      tipe,
      nomor_polisi,
      tahun,
      kilometer
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await vehicleService.updateVehicle(req.user.id, req.params.id, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await vehicleService.deleteVehicle(req.user.id, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  create,
  update,
  remove
};
