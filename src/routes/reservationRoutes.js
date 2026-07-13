const express = require("express");
const reservationController = require("../controllers/reservationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/recommendation", reservationController.recommend);

router.use(authMiddleware);
router.get("/", reservationController.list);
router.post("/", reservationController.create);
router.get("/:id", reservationController.getById);
router.put("/:id", reservationController.update);
router.delete("/:id", reservationController.remove);

module.exports = router;
