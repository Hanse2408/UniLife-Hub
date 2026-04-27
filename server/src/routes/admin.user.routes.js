const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
} = require("../controllers/admin.user.controller");

router.use(authRequired, authorizeRoles("ADMIN"));

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/suspend", suspendUser);
router.patch("/users/:id/reactivate", reactivateUser);

module.exports = router;
