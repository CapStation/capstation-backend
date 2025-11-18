const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const {
  validateCompetency,
  validateCompetencies,
  validateCompetencySearch,
  validateUserId,
  validateCompetencyIndex,
} = require("../middlewares/userValidator");

// User list route (with optional role filter)
router.get("/", authMiddleware, userController.getUsers);

// Export users route
router.get("/export", authMiddleware, userController.exportUsers);

// Admin: Create new user (Admin only)
router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  userController.createUser
);

// Validate user role (Admin only)
router.patch(
  "/:userId/validate-role",
  authMiddleware,
  requireRole("admin"),
  userController.validateUserRole
);

// Admin: Update and delete user (Admin only)
router.put(
  "/:userId",
  authMiddleware,
  requireRole("admin"),
  userController.updateUser
);
router.delete(
  "/:userId",
  authMiddleware,
  requireRole("admin"),
  userController.deleteUser
);

// Profile routes
router.get("/profile", authMiddleware, userController.getMyProfile);
router.get(
  "/profile/:userId",
  authMiddleware,
  validateUserId,
  userController.getUserProfile
);

// Competency CRUD routes
router.get("/competencies", authMiddleware, userController.getMyCompetencies);
router.post(
  "/competencies",
  authMiddleware,
  validateCompetency,
  userController.addCompetency
);
router.put(
  "/competencies/:index",
  authMiddleware,
  validateCompetencyIndex,
  validateCompetency,
  userController.updateCompetency
);
router.delete(
  "/competencies/:index",
  authMiddleware,
  validateCompetencyIndex,
  userController.deleteCompetency
);
router.put(
  "/competencies",
  authMiddleware,
  validateCompetencies,
  userController.setCompetencies
);

// Search routes (consolidated)
router.get(
  "/search",
  authMiddleware,
  validateCompetencySearch,
  userController.searchUsersByCompetency
);
router.get("/search-by-email", authMiddleware, userController.searchByEmail);
router.get(
  "/autocomplete-email",
  authMiddleware,
  userController.autocompleteEmail
);

module.exports = router;
