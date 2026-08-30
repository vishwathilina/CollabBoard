const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validate } = require("../middleware/validate.middleware");
const { protect } = require("../middleware/auth.middleware");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");
const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", validate({ body: loginSchema }), asyncHandler(authController.login));
router.get("/me", protect, asyncHandler(authController.me));
router.post("/logout", protect, asyncHandler(authController.logout));

module.exports = router;
