const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    clientName: { type: String, required: true },
    organization: { type: String, required: true },

    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidateMobile: { type: String, required: true },

    fullAddress: { type: String, required: true },
    district: { type: String, required: true },
    pincode: { type: String, required: true },
    referenceId: { type: String, required: true },

    token: { type: String, required: true, unique: true },
    tokenDisabled: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "submitted"],
      default: "pending",
    },

    center: {
      lat: Number,
      lng: Number
    },
    radius: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invite", inviteSchema);