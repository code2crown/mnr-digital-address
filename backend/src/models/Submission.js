const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    invite: { type: mongoose.Schema.Types.ObjectId, ref: "Invite", required: true },

    ownership: String,
    addressType: String,
    fromMonth: String,
    fromYear: String,
    toMonth: String,
    toYear: String,
    verifiedByRelation: String,
    verifiedPersonName: String,
    resolvedAddress: String,

    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      address: String,
    },

    mapImageUrl: String,

    photos: {
      houseEntrance: String,
      selfieWithHouse: String,
      idPhoto: String,
      landmarkPhoto: String,
    },

    signatureUrl: String,

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "submitted"],
      default: "pending"
    },

    rejectReason: String,
    acceptedAt: Date,
    rejectedAt: Date,
    regeneratedLink: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);