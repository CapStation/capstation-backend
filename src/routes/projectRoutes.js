// src/routes/projects.routes.js
const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  requireRole,
  requireOwnershipOrRole,
} = require("../middlewares/roleMiddleware");

// Create project (mahasiswa owner)
router.post(
  "/",
  authMiddleware,
  requireRole("mahasiswa", "dosen", "admin"),
  async (req, res, next) => {
    try {
      const payload = req.body;
      payload.owner = payload.owner || req.user._id;
      const p = await Project.create(payload);
      res.status(201).json(p);
    } catch (err) {
      next(err);
    }
  }
);

// Update project: owner OR admin OR dosen
router.put(
  "/:id",
  authMiddleware,
  requireOwnershipOrRole(Project, "owner", "id", "admin", "dosen"),
  async (req, res, next) => {
    try {
      const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Delete: only owner or admin
router.delete(
  "/:id",
  authMiddleware,
  requireOwnershipOrRole(Project, "owner", "id", "admin"),
  async (req, res, next) => {
    try {
      await Project.findByIdAndDelete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// GET all projects (public or with auth, sesuai kebutuhan)
router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find().populate("owner group", "name email");
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
