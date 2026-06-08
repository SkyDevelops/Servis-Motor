const express = require("express");
const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", vehicleController.list);
router.post("/", vehicleController.create);
router.put("/:id", vehicleController.update);
router.delete("/:id", vehicleController.remove);

module.exports = router;
