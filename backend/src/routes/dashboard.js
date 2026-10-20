const router = require("express").Router();
const Invite = require("../models/Invite");
const Submission = require("../models/Submission");
const auth = require("../middleware/auth");

router.get("/stats", auth, async (req, res) => {
  try {
    const query = req.user.role === "superadmin" ? {} : { clientId: req.user.id };
    const inviteQuery = req.user.role === "superadmin" ? {} : { clientId: req.user.id };

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalInvites = await Invite.countDocuments(inviteQuery);
    const submittedTotal = await Submission.countDocuments(query);
    const pendingAll = await Invite.countDocuments({ ...inviteQuery, tokenDisabled: false });
    const invitesToday = await Invite.countDocuments({ ...inviteQuery, createdAt: { $gte: startToday } });
    const submittedToday = await Submission.countDocuments({ ...query, createdAt: { $gte: startToday } });
    const invitesThisMonth = await Invite.countDocuments({ ...inviteQuery, createdAt: { $gte: startMonth } });

    res.json({
      success: true,
      stats: {
        totalInvites,
        submittedTotal,
        pendingAll,
        invitesToday,
        submittedToday,
        invitesThisMonth,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/recent-invites", auth, async (req, res) => {
  try {
    const filter = req.user.role === "superadmin" ? {} : { clientId: req.user.id };
    const invites = await Invite.find(filter).sort({ createdAt: -1 }).limit(5);
    res.json({ success: true, invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/recent-submissions", auth, async (req, res) => {
  try {
    const filter = req.user.role === "superadmin" ? {} : { clientId: req.user.id };
    const subs = await Submission.find(filter).populate("invite").sort({ createdAt: -1 }).limit(5);
    res.json({ success: true, submissions: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;