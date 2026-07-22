const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const Submission = require("../models/Submission");

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "https://mnr-digital-address.vercel.app";
const GEO_KEY = process.env.GEOAPIFY_API_KEY;



/* ================= PDF ROUTE ================= */

router.get("/submission/:id", async (req, res) => {
  let browser;

  try {
    const submission = await Submission.findById(req.params.id).populate(
      "invite"
    );
    if (!submission) return res.status(404).send("Submission not found");

    const executablePath = await chromium.executablePath();

browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});

    const page = await browser.newPage();
    const html = generateHTML(submission);

    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForTimeout(1000);


    // wait only if map exists
    if (submission.mapImageUrl) {
      await page.waitForSelector("#map-image", { timeout: 10000 });
    }

    // EXTRA SAFETY
    await page.evaluate(() => {
      const img = document.getElementById("map-image");
      if (img && !img.complete) {
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "60px",
        bottom: "60px",
        left: "40px",
        right: "40px",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=Address_Verification_${submission._id}.pdf`,
      "Content-Length": pdf.length,
    });

    res.send(pdf);
  } catch (err) {
    console.error("PDF ERROR:", err);
    if (browser) await browser.close();
    res.status(500).send("Failed to generate PDF");
  }
});

module.exports = router;

/* ================= HTML TEMPLATE ================= */

function generateHTML(sub) {
  const inv = sub.invite || {};

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
body {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #000;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #0B8A42;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-left img {
  height: 60px;
  margin-right: 12px;
}

.header-right {
  text-align: right;
  font-size: 11px;
}

.report-title {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  }

.section {
  margin-bottom: 18px;
}

.section h2 {
  background: #f3f4f6;
  padding: 6px;
  font-size: 13px;
  border-left: 4px solid #D4A017;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: 6px;
  border-bottom: 1px solid #ddd;
}

.label {
  width: 35%;
  font-weight: bold;
}

.page-break {
  page-break-before: always;
}

.photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.photo {
  border: 1px solid #bbb;
  padding: 8px;
}

.photo img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border: 1px solid #ccc;
}

.watermark {
  position: fixed;
  top: 45%;
  left: 15%;
  font-size: 70px;
  color: rgba(0,0,0,0.08);
  transform: rotate(-30deg);
  z-index: 0;
}

footer {
  position: fixed;
  bottom: 15px;
  width: 100%;
  text-align: center;
  font-size: 9px;
  color: gray;
}
</style>
</head>

<body>

<div class="watermark">MNR VERIFIED</div>

<header>
  <div class="header-left">
    <img src="${CLIENT_URL}/logo.png" />
    <div>
      <h1>MNR Solutions Private Limited</h1>
    </div>
  </div>

  <div class="header-right">
    <div><strong>Report Date</strong></div>
    <div>${new Date().toLocaleDateString()}</div>
    <div>${new Date().toLocaleTimeString()}</div>
  </div>
</header>

<div class="section">
<div class="report-title">
<p>Address Verification Report</p>
</div>
</div>

<div class="section">
  <h2>Client & Candidate Details</h2>
  <table>
    <tr><td class="label">Client Name</td><td>${inv.clientName || "—"}</td></tr>
    <tr><td class="label">Candidate Name</td><td>${
      inv.candidateName || "—"
    }</td></tr>
    <tr><td class="label">Mobile</td><td>${inv.candidateMobile || "—"}</td></tr>
    <tr><td class="label">Reference ID</td><td>${
      inv.referenceId || "—"
    }</td></tr>
  </table>
</div>

<div class="section">
  <h2>Address Details</h2>
  <table>
    <tr><td class="label">Address</td><td>${inv.fullAddress || "—"}</td></tr>
    <tr><td class="label">District</td><td>${inv.district || "—"}</td></tr>
    <tr><td class="label">Pincode</td><td>${inv.pincode || "—"}</td></tr>
    <tr><td class="label">Ownership</td><td>${sub.ownership || "—"}</td></tr>
    <tr><td class="label">Verifier Name</td><td>${
      sub.verifiedPersonName || "—"
    }</td></tr>
    <tr><td class="label">Verifier Relation</td><td>${
      sub.verifiedByRelation || "—"
    }</td></tr>
    <tr><td class="label">Address Type</td><td>${
      sub.addressType || "—"
    }</td></tr>
    <tr><td class="label">Stay Period</td>
      <td>${sub.fromMonth || ""} ${sub.fromYear || ""} - ${sub.toMonth || ""} ${
    sub.toYear || ""
  }</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Location Verification</h2>

  <table>
    <tr>
      <td class="label">Latitude</td>
      <td>${sub.location?.lat || "-"}</td>
    </tr>
    <tr>
      <td class="label">Longitude</td>
      <td>${sub.location?.lng || "-"}</td>
    </tr>
    <tr>
      <td class="label">Accuracy</td>
      <td>${sub.location?.accuracy + " m" || "-"}</td>
    </tr>
    <tr>
      <td class="label">Resolved Address</td>
      <td>${sub.resolvedAddress || "-"}</td>
    </tr>
  </table>

  ${
    sub.mapImageUrl
      ? `<img
  id="map-image"
  src="${sub.mapImageUrl}"
  style="
    width:100%;
    height:200px;
    object-fit:cover;
    border:1px solid #aaa;
    border-radius:6px;
  "
/>`
      : `<p style="color:#999">Map snapshot not available</p>`
  }
</div>




<div class="page-break"></div>

<div class="section">
  <h2>Photographic Evidence</h2>
  <div class="photos">
    ${imageBlock(sub.photos?.houseEntrance, "House Entrance")}
    ${imageBlock(sub.photos?.selfieWithHouse, "Selfie with House")}
    ${imageBlock(sub.photos?.idPhoto, "ID Proof")}
    ${imageBlock(sub.photos?.landmarkPhoto, "Address Proof")}
  </div>
</div>

<div class="section">
  <h2>Candidate Signature</h2>
  ${
    sub.signatureUrl
      ? `<img src="${sub.signatureUrl}" style="width:100%;max-width:400px" />`
      : `<p>No signature available</p>`
  }
</div>

<div class="section">
<h2>Disclaimer</h2>
<ul>
   <li>This report is generated using digitally captured data including GPS location, photographs, and electronic signature provided during verification.</li>
   <li>Location details are GPS-based and may vary depending on device accuracy, network availability, and environmental conditions.</li>
   <li>The map image shown is for reference purposes only and represents an approximate location at the time of capture.</li>
   <li>No physical site visit or manual verification was conducted unless explicitly mentioned.</li>
   <li>This report is system-generated and intended solely for internal verification and compliance purposes.</li>
</ul>  
</div>

<footer>
  Generated on ${new Date().toLocaleString()} | System Generated Report
</footer>

</body>
</html>
`;
}

function imageBlock(url, label) {
  if (!url) return "";
  return `
    <div class="photo">
      <strong>${label}</strong>
      <img src="${url}" />
    </div>
  `;
}










