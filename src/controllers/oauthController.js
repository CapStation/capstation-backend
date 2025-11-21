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

    if (role === "dosen") {
      if (allowedDomains.includes(emailDomain)) {
        user.role = "dosen";
        user.roleApproved = true;
      } else {
        user.pendingRole = "dosen";
        user.roleApproved = false;
        await user.save();
        return res.json({
          message: "Dosen requested — pending admin approval",
          isPending: true,
        });
      }
    }

    if (role === "mahasiswa") {
      user.role = "mahasiswa";
      user.roleApproved = true;
    }

    user.pendingRole = null;
    user.isVerified = true;
    await user.save();

    // BUG FIX: Only return accessToken if role is approved
    // For pending roles, don't auto-login
    if (!user.roleApproved) {
      return res.json({
        message: "Role menunggu persetujuan admin",
        isPending: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          roleApproved: user.roleApproved,
        },
      });
    }

    const accessToken = generateToken(user);
    return res.json({
      accessToken,
      isPending: false,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        roleApproved: user.roleApproved,
      },
    });
  } catch (err) {
    return next(err);
  }
};
