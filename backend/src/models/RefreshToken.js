const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
  token: String,
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  expiresAt: Date,
  revoked: { type: Boolean, default: false },
  replacedByToken: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);