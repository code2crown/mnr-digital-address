const mongoose = require("mongoose");

const InvoiceStatusSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InvoiceStatusSchema.index({ clientId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("InvoiceStatus", InvoiceStatusSchema);