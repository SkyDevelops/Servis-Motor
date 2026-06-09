const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("admin"));

router.get("/dashboard", adminController.dashboard);
router.get("/users", adminController.users);
router.get("/reservations", adminController.reservations);
router.put("/reservations/:id", adminController.updateReservationStatus);
router.get("/cashier", adminController.cashierData);
router.post("/cashier", adminController.createCashierTransaction);

module.exports = router;
