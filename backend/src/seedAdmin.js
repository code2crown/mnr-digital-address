const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");
const Invite = require("./models/Invite");
const Submission = require("./models/Submission");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // 1. Create Code 2 Crown Super Admin
    const superEmail = "admin@code2crown.com";
    const superPass = await bcrypt.hash("Admin@123", 10);

    const superAdmin = await Admin.findOneAndUpdate(
      { email: superEmail },
      {
        name: "Code 2 Crown Admin",
        companyName: "Code 2 Crown",
        companyShortName: "C2C",
        email: superEmail,
        passwordHash: superPass,
        role: "superadmin",
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log("👑 Super Admin Ready -> admin@code2crown.com | Pass: Admin@123");

    // 2. Safely Update MNR to Client WITHOUT overwriting existing live password
    const mnrEmail =
      process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_EMAIL !== superEmail
        ? process.env.SEED_ADMIN_EMAIL
        : "mnr@client.com";

    let mnrClient = await Admin.findOne({ email: mnrEmail });
    if (mnrClient) {
      mnrClient.companyName = mnrClient.companyName || "MNR Solutions Private Limited";
      mnrClient.companyShortName = mnrClient.companyShortName || "MNR";
      mnrClient.role = "client";
      mnrClient.isActive = true;
      if (!mnrClient.ratePerVerification) mnrClient.ratePerVerification = 50;
      await mnrClient.save();
    } else {
      const mnrPass = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "Mnr@123", 10);
      mnrClient = await Admin.create({
        name: "MNR Admin",
        companyName: "MNR Solutions Private Limited",
        companyShortName: "MNR",
        email: mnrEmail,
        passwordHash: mnrPass,
        role: "client",
        ratePerVerification: 50,
        isActive: true,
      });
    }
    console.log(`🏢 Client Ready (MNR) -> ${mnrEmail} (Live password preserved!)`);

    // 3. Link all old Invites & Submissions to MNR Client
    await Invite.updateMany(
      { $or: [{ clientId: {$exists: false } }, { clientId: superAdmin._id }] },
      { $set: { clientId: mnrClient._id, clientName: mnrClient.companyName } }
    );
    await Submission.updateMany(
      { $or: [{ clientId: {$exists: false } }, { clientId: superAdmin._id }] },
      { $set: { clientId: mnrClient._id } }
    );

    console.log("✅ All existing Invites & Submissions safely linked to MNR!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  }
}

run();