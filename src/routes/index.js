const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const projectRoutes = require("./projectRoutes");

router.use("/auth", authRoutes);
router.use("/auth/oauth", require("./oauthRoutes"));
router.use("/projects", projectRoutes);

module.exports = router;
