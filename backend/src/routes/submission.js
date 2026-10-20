const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Invite = require("../models/Invite");
const Submission = require("../models/Submission");
const auth = require("../middleware/auth");
const router = express.Router();

function getGoogleStaticMap(lat, lng) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  lat = Number(lat);
  lng = Number(lng);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=800x400&scale=2&maptype=roadmap&markers=color:red%7Clabel:C%7C${lat},${lng}&key=${API_KEY}`;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}

router.get("/filter", auth, async (req, res) => {
  try {
    const { from, to, status, refId, search, page = 1, limit = 10 } = req.query;
    let query = req.user.role === "superadmin" ? {} : { clientId: req.user.id };

    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + "T23:59:59");
    }

    let inviteFilter = {};
    if (req.user.role !== "superadmin") {
      inviteFilter.clientId = req.user.id;
    }

    if (refId) {
      inviteFilter.referenceId = new RegExp(refId.trim(), "i");
    }

    if (search) {
      const s = search.trim();
      inviteFilter.$or = [
        { candidateName: new RegExp(s, "i") },
        { candidateMobile: new RegExp(s, "i") },
        { referenceId: new RegExp(s, "i") },
      ];
    }

    if (refId || search) {
      const invites = await Invite.find(inviteFilter).select("_id");
      query.invite = { $in: invites.map((i) => i._id) };
    }

    const total = await Submission.countDocuments(query);
    const submissions = await Submission.find(query)
      .populate("invite")
      .populate("clientId", "companyName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      submissions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  "/submit/:token",
  upload.fields([
    { name: "houseEntrance" },
    { name: "selfieWithHouse" },
    { name: "idPhoto" },
    { name: "landmarkPhoto" },
  ]),
  async (req, res) => {
    try {
      const invite = await Invite.findOne({ token: req.params.token });
      if (!invite || invite.tokenDisabled) {
        return res.status(410).json({ success: false, message: "Invalid or disabled link" });
      }

      const { lat, lng, accuracy, ownership, addressType, fromMonth, fromYear, toMonth, toYear, resolvedAddress, verifiedByRelation, verifiedPersonName } = req.body;

      const mapImageUrl = getGoogleStaticMap(Number(lat), Number(lng));

      const photos = {};
      if (req.files.houseEntrance) photos.houseEntrance = await uploadBuffer(req.files.houseEntrance[0].buffer, "c2c/house");
      if (req.files.selfieWithHouse) photos.selfieWithHouse = await uploadBuffer(req.files.selfieWithHouse[0].buffer, "c2c/selfie");
      if (req.files.idPhoto) photos.idPhoto = await uploadBuffer(req.files.idPhoto[0].buffer, "c2c/id");
      if (req.files.landmarkPhoto) photos.landmarkPhoto = await uploadBuffer(req.files.landmarkPhoto[0].buffer, "c2c/landmark");

      let signatureUrl = null;
      if (req.body.signature?.startsWith("data:image")) {
        const base64 = req.body.signature.split(",")[1];
        signatureUrl = await uploadBuffer(Buffer.from(base64, "base64"), "c2c/signatures");
      }

      let submission = await Submission.findOne({ invite: invite._id });

      if (submission) {
        submission.ownership = ownership;
        submission.addressType = addressType;
        submission.fromMonth = fromMonth;
        submission.fromYear = fromYear;
        submission.toMonth = toMonth;
        submission.toYear = toYear;
        submission.resolvedAddress = resolvedAddress;
        submission.verifiedByRelation = verifiedByRelation;
        submission.verifiedPersonName = verifiedPersonName;
        submission.location = { lat, lng, accuracy };
        submission.mapImageUrl = mapImageUrl;
        submission.photos = photos;
        submission.signatureUrl = signatureUrl;
        submission.status = "submitted";
        submission.rejectedAt = null;
        submission.rejectReason = null;
        await submission.save();
      } else {
        submission = await Submission.create({
          clientId: invite.clientId,
          invite: invite._id,
          ownership,
          addressType,
          fromMonth,
          fromYear,
          toMonth,
          toYear,
          resolvedAddress,
          verifiedByRelation,
          verifiedPersonName,
          location: { lat, lng, accuracy },
          mapImageUrl,
          photos,
          signatureUrl,
          status: "submitted",
        });
      }

      invite.tokenDisabled = true;
      invite.status = "submitted";
      await invite.save();

      res.json({ success: true, message: "Submitted successfully", submission });
    } catch (err) {
      console.error("SUBMISSION ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get("/:id", auth, async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id).populate("invite");
    if (!sub) return res.status(404).json({ success: false, message: "Not found" });

    if (req.user.role !== "superadmin" && sub.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/accept/:id", auth, async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Not found" });

    if (req.user.role !== "superadmin" && sub.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    sub.status = "accepted";
    sub.acceptedAt = new Date();
    await sub.save();

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/reject/:id", auth, async (req, res) => {
  try {
    const reason = req.body.reason?.trim();
    if (!reason) return res.status(400).json({ success: false, message: "Reason required" });

    const submission = await Submission.findById(req.params.id).populate("invite");
    if (!submission) return res.status(404).json({ success: false, message: "Not found" });

    const invite = submission.invite;
    invite.tokenDisabled = false;
    invite.status = "pending";
    await invite.save();

    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
    const regeneratedLink = `${CLIENT_URL}/verify/${invite.token}`;

    submission.status = "rejected";
    submission.rejectReason = reason;
    submission.rejectedAt = new Date();
    submission.regeneratedLink = regeneratedLink;
    await submission.save();

    res.json({ success: true, link: regeneratedLink, submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/delete/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only Super Admin can delete submissions" });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: "Not found" });

    if (submission.invite) await Invite.findByIdAndDelete(submission.invite);
    await Submission.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;