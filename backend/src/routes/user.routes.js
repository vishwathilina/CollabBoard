const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { userIdParamSchema } = require("../schemas/user.schema");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.use(protect);

router.get("/", asyncHandler(userController.listUsers));
router.get("/:id", validate({ params: userIdParamSchema }), asyncHandler(userController.getUserById));

module.exports = router;
