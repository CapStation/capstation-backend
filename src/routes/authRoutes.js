const express = require("express");
const { body } = require("express-validator");
const passport = require("passport");
const router = express.Router();
const authController = require("../controllers/authController");
const { validate } = require("../middlewares/authValidator");
const { generateSetupToken } = require("../middlewares/authMiddleware");

// Register
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  validate,
  authController.register
);

// Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  authController.login
);

// Forgot password
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email required")],
  validate,
  authController.forgotPassword
);

// Reset password
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password min 6 chars"),
  ],
  validate,
  authController.resetPassword
);

// Google OAuth init
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/google/failure",
  }),
  async (req, res) => {
    const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
    const user = req.user;

    // BUG FIX: Check if user already has a role assigned
    // If yes, skip oauth-setup and login directly
    if (user.role && user.roleApproved) {
      // User already has validated role - generate access token
      const { generateToken } = require("../middlewares/authMiddleware");
      const accessToken = generateToken(user);

      // Redirect to frontend with token for auto-login
      const redirect = `${frontend}/oauth-callback?token=${encodeURIComponent(
        accessToken
      )}`;
      return res.redirect(redirect);
    }

    // User needs to select role or is pending approval
    if (user.pendingRole && !user.roleApproved) {
      // User has pending role waiting for admin approval
      const redirect = `${frontend}/account-pending?reason=role_approval`;
      return res.redirect(redirect);
    }

    // User needs to select role - generate setup token
    const setupToken = generateSetupToken(user);
    const redirect = `${frontend}/oauth-setup?token=${encodeURIComponent(
      setupToken
    )}`;
    res.redirect(redirect);
  }
);

// Failure
router.get("/google/failure", (req, res) =>
  res.status(401).json({ message: "Google auth failed" })
);

// Email verification (GET)
router.get("/verify", authController.verifyEmail);

// Email verification (POST) - for frontend flow
router.post(
  "/verify-email",
  [
    body("token").notEmpty().withMessage("Token required"),
    body("email").isEmail().withMessage("Valid email required"),
  ],
  validate,
  authController.verifyEmailPost
);

module.exports = router;
