const router = require("express").Router();
const Submission = require("../models/Submission");
const Admin = require("../models/Admin");
const InvoiceStatus = require("../models/InvoiceStatus");
const auth = require("../middleware/auth");

// Get monthly bill for a client
router.get("/client-bill/:clientId", auth, async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const targetClientId = req.params.clientId;

    if (req.user.role !== "superadmin" && req.user.id !== targetClientId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const client = await Admin.findById(targetClientId);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Accepted cases in that month (fallback to updatedAt if acceptedAt was not set on old records)
    const submissions = await Submission.find({
      clientId: targetClientId,
      status: "accepted",
      $or: [
        { acceptedAt: { $gte: startDate,$lte: endDate } },
        { acceptedAt: { $exists: false }, updatedAt: { $gte: startDate,$lte: endDate } },
      ],
    }).populate("invite");

    const invoiceRecord = await InvoiceStatus.findOne({
      clientId: targetClientId,
      month,
      year,
    });

    const rate = client.ratePerVerification || 50;
    const totalVerified = submissions.length;
    const totalAmount = totalVerified * rate;

    res.json({
      success: true,
      client: {
        name: client.companyName,
        email: client.email,
        gst: client.gstNumber,
        address: client.companyAddress,
      },
      billingMonth: `${month}/${year}`,
      ratePerVerification: rate,
      totalVerifiedCases: totalVerified,
      totalAmount,
      paymentStatus: invoiceRecord ? invoiceRecord.status : "unpaid",
      paidAt: invoiceRecord ? invoiceRecord.paidAt : null,
      submissions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle Paid / Unpaid Status (Super Admin Only)
router.post("/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only Super Admin can change bill status" });
    }

    const { clientId, month, year, status } = req.body;

    const record = await InvoiceStatus.findOneAndUpdate(
      { clientId, month: Number(month), year: Number(year) },
      {
        status,
        paidAt: status === "paid" ? new Date() : null,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Bill marked as ${status.toUpperCase()}`,
      record,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;