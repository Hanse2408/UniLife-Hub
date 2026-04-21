/**
 * @module FoodAdminRoutes
 * @description Admin-level operations for vendor lifecycle management and campus delivery dispatch.
 * @author Amarasinghe V G N H (IT23860728)
 */
const express = require("express");
const router = express.Router();
// Middleware integration for role-based access control