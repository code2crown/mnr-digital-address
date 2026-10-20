const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

// Get all clients (Super admin only)
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const clients = await Admin.find({ role: "client" })
      .select("-passwordHash")
      .sort({ createdAt: -1 });
    res.json({ success: true, clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new client (Super admin only)
router.post("/create", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const {
      name,
      companyName,
      companyShortName,
      companyLogo,
      supportPhone,
      companyAddress,
      gstNumber,
      email,
      password,
      ratePerVerification,
    } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password || "Client@123", 10);

    const newClient = await Admin.create({
      name,
      companyName,
      companyShortName: companyShortName || companyName,
      companyLogo,
      supportPhone,
      companyAddress,
      gstNumber,
      email,
      passwordHash,
      role: "client",
      ratePerVerification: Number(ratePerVerification) || 50,
    });

    res.json({ success: true, message: "Client created successfully", client: newClient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update client details & password (Super admin only)
router.put("/update/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updateData = { ...req.body };

    // Agar naya password bheja gaya hai toh hash karein
    if (updateData.password && updateData.password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(updateData.password.trim(), 10);
    }
    delete updateData.password;

    const updated = await Admin.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-passwordHash");

    res.json({ success: true, message: "Client updated successfully", client: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;