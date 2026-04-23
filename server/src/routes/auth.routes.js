const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
} = require("../controllers/auth.controller");

const { authRequired } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  registerValidator,
  loginValidator,
} = require("../validators/auth.validators");

router.post("/register", registerValidator, validate, registerUser);
router.post("/login", loginValidator, validate, loginUser);
router.get("/me", authRequired, getMyProfile);
router.patch("/me", authRequired, updateMyProfile);

module.exports = router;