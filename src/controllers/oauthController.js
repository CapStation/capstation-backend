const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { generateToken } = require("../middlewares/authMiddleware");

exports.completeOauthProfile = async (req, res, next) => {
  try {
    const bearer =
      (req.headers.authorization && req.headers.authorization.split(" ")[1]) ||
      req.body.token;

    if (!bearer) {
      return res.status(400).json({
        message: "Missing setup token",
        code: "MISSING_TOKEN",
      });
    }

    // Verify JWT token
    let payload;
    try {
      payload = jwt.verify(bearer, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return res.status(401).json({
        message: "Invalid or expired setup token",
        code: "INVALID_TOKEN",
        error: jwtError.message,
      });
    }

    if (payload.purpose !== "oauth-setup") {
      return res.status(401).json({
        message: "Invalid setup token - wrong purpose",
        code: "WRONG_TOKEN_PURPOSE",
        expected: "oauth-setup",
        received: payload.purpose,
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    // BUG FIX #3: If user already has approved role, return success with redirect to dashboard
    if (user.role && user.roleApproved) {
      return res.status(200).json({
        message: "User sudah memiliki role yang disetujui",
        code: "ALREADY_APPROVED",
        role: user.role,
        shouldRedirect: true,
        redirectTo: "/dashboard",
      });
    }

    // BUG FIX #2: If user has pending role awaiting approval, inform them
    if (user.pendingRole && !user.roleApproved) {
      return res.status(200).json({
        message: `Role ${user.pendingRole} sedang menunggu persetujuan admin`,
        code: "PENDING_APPROVAL",
        pendingRole: user.pendingRole,
        isPending: true,
        shouldRedirect: true,
        redirectTo: "/account-pending?reason=role_approval",
      });
    }

    // BUG FIX: Prevent role re-selection
    // Only check if user has ACTUALLY selected a role (not default/null values)
    const hasSelectedRole = user.role !== null && user.role !== undefined;
    const hasPendingRole =
      user.pendingRole !== null && user.pendingRole !== undefined;

    if (hasSelectedRole || hasPendingRole) {
      return res.status(400).json({
        message: "Role sudah dipilih sebelumnya",
        code: "ROLE_ALREADY_SELECTED",
        currentRole: user.role || user.pendingRole,
      });
    }

    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role required" });

    // Security: only allow safe auto-assign
    const allowedDomains = (process.env.ALLOWED_DOSHEN_DOMAINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const emailDomain = user.email.split("@")[1] || "";

    if (role === "admin") {
      user.pendingRole = "admin";
      user.roleApproved = false;
      await user.save();
      return res.json({
        message: "Admin requested — pending approval",
        isPending: true,
      });
    }

    // OAUTH POLICY: All OAuth users (Mahasiswa & Dosen) require admin approval
    // No auto-approval for OAuth registration
    if (role === "dosen") {
      user.pendingRole = "dosen";
      user.roleApproved = false;
      user.isVerified = true; // Email verified by Google
      await user.save();

      return res.json({
        message: "Role Dosen sedang menunggu persetujuan admin",
        isPending: true,
      });
    }

    if (role === "mahasiswa") {
      user.pendingRole = "mahasiswa";
      user.roleApproved = false;
      user.isVerified = true; // Email verified by Google
      await user.save();

      return res.json({
        message: "Role Mahasiswa sedang menunggu persetujuan admin",
        isPending: true,
      });
    }

    // If role not recognized
    return res.status(400).json({
      message: "Invalid role selected",
      code: "INVALID_ROLE",
    });
  } catch (err) {
    return next(err);
  }
};
