const router = require("express").Router();
const Invite = require("../models/Invite");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

router.get("/all", auth, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filters = {};
    if (req.user.role !== "superadmin") {
      filters.clientId = req.user.id;
    }

    if (req.query.from || req.query.to) {
      filters.createdAt = {};
      if (req.query.from) filters.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filters.createdAt.$lte = new Date(req.query.to + "T23:59:59");
    }

    // Search by Reference ID specifically
    if (req.query.refId) {
      filters.referenceId = { $regex: req.query.refId.trim(), $options: "i" };
    }

    // Search by Candidate Name, Mobile, or Reference ID
    if (req.query.search) {
      const s = req.query.search.trim();
      filters.$or = [
        { candidateName: { $regex: s, $options: "i" } },
        { candidateMobile: { $regex: s, $options: "i" } },
        { referenceId: { $regex: s, $options: "i" } },
      ];
    }

    const total = await Invite.countDocuments(filters);
    const invites = await Invite.find(filters)
      .populate("clientId", "companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, invites, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ success: false, message: "Invite not found" });

    if (req.user.role !== "superadmin" && invite.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${invite.token}`;
    res.json({ success: true, invite, link });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/create", auth, async (req, res) => {
  try {
    const { candidateName, candidateEmail, candidateMobile, fullAddress, district, pincode, referenceId } = req.body;

    let clientId = req.user.id;
    let clientName = req.user.companyName;

    // If superadmin creates an invite, they can pass target clientId if needed, else fallback to admin
    if (req.user.role === "superadmin" && req.body.clientId) {
      clientId = req.body.clientId;
      const targetClient = await Admin.findById(clientId);
      if (targetClient) clientName = targetClient.companyName;
    }

    const token = uuidv4();
    const invite = await Invite.create({
      clientId,
      clientName,
      organization: clientName,
      candidateName,
      candidateEmail,
      candidateMobile,
      fullAddress,
      district,
      pincode,
      referenceId,
      token,
    });

    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${token}`;

    return res.json({
      success: true,
      message: "Invite created successfully",
      invite,
      link,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/delete/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only Super Admin can delete invites" });
    }
    await Invite.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Invite deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;