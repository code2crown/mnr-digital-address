const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Contact person name
  companyName: { type: String, required: true }, // e.g., "MNR Solutions Pvt Ltd" or "Code 2 Crown"
  companyShortName: { type: String, default: "" }, // e.g., "MNR" (Watermark ke liye)
  companyLogo: { type: String, default: "" }, // Cloudinary URL of Client Logo
  supportPhone: { type: String, default: "" }, // Candidate form ke liye
  companyAddress: { type: String, default: "" }, // Invoice/Billing ke liye
  gstNumber: { type: String, default: "" }, // Invoice/Billing ke liye
  
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["superadmin", "client"], default: "client" },
  
  ratePerVerification: { type: Number, default: 50 }, // Per accepted case billing rate (₹)
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Admin", AdminSchema);