const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Admin = require("../models/Admin");
const RefreshToken = require("../models/RefreshToken");
const auth = require("../middleware/auth");

const router = express.Router();

function signAccess(admin) {
  return jwt.sign(
    { id: admin._id, role: admin.role, companyName: admin.companyName },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1d" }
  );
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isActive) {
      return res.status(400).json({ message: "Invalid login credentials or account inactive" });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid login credentials" });

    const accessToken = signAccess(admin);
    const refreshToken = uuidv4();

    await RefreshToken.create({
      token: refreshToken,
      admin: admin._id,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400000,
    });

    res.json({
      accessToken,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        companyName: admin.companyName,
        companyLogo: admin.companyLogo,
        supportPhone: admin.supportPhone,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-passwordHash");
    if (!admin) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user: admin });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) return res.sendStatus(401);

    const found = await RefreshToken.findOne({ token: oldToken, revoked: false });
    if (!found) return res.sendStatus(401);

    const admin = await Admin.findById(found.admin);
    if (!admin || !admin.isActive) return res.sendStatus(401);

    found.revoked = true;
    const newToken = uuidv4();
    found.replacedByToken = newToken;
    await found.save();

    await RefreshToken.create({
      token: newToken,
      admin: admin._id,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    res.cookie("refreshToken", newToken, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400000,
    });

    const accessToken = signAccess(admin);
    res.json({ accessToken });
  } catch {
    res.sendStatus(500);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;