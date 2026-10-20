const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const Submission = require("../models/Submission");
const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

async function fetchImageAsBase64(url) {
  if (!url) return null;
  if (url.startsWith("data:image")) return url;
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const contentType = response.headers["content-type"] || "";
    // Ensure response is actually an image and not an error page
    if (!contentType.startsWith("image/")) return null;
    return `data:${contentType};base64,${Buffer.from(response.data, "binary").toString("base64")}`;
  } catch {
    return null;
  }
}

router.get("/submission/:id", async (req, res) => {
  let browser;
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("invite")
      .populate("clientId");

    if (!submission) return res.status(404).send("Submission not found");

    const client = submission.clientId || {};
    const inv = submission.invite || {};

    const lat = Number(submission.location?.lat);
    const lng = Number(submission.location?.lng);
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;

    // Try Google Static Map ONLY if key is valid and returns a real image
    let validGoogleMapBase64 = null;
    if (lat && lng && googleKey && googleKey.trim() !== "" && !googleKey.includes("your_")) {
      const gUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=800x360&scale=2&maptype=roadmap&markers=color:red%7Clabel:C%7C${lat},${lng}&key=${googleKey}`;
      validGoogleMapBase64 = await fetchImageAsBase64(gUrl);
    }

    const [logoSrc, houseSrc, selfieSrc, idSrc, landmarkSrc, sigSrc] = await Promise.all([
      fetchImageAsBase64(client.companyLogo || `${CLIENT_URL}/logo.png`),
      fetchImageAsBase64(submission.photos?.houseEntrance),
      fetchImageAsBase64(submission.photos?.selfieWithHouse),
      fetchImageAsBase64(submission.photos?.idPhoto),
      fetchImageAsBase64(submission.photos?.landmarkPhoto),
      fetchImageAsBase64(submission.signatureUrl),
    ]);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ],
    });

    const page = await browser.newPage();
    const html = generateHTML(submission, {
      logoSrc,
      validGoogleMapBase64,
      houseSrc: houseSrc || submission.photos?.houseEntrance,
      selfieSrc: selfieSrc || submission.photos?.selfieWithHouse,
      idSrc: idSrc || submission.photos?.idPhoto,
      landmarkSrc: landmarkSrc || submission.photos?.landmarkPhoto,
      sigSrc: sigSrc || submission.signatureUrl,
    });

    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait 1.8s so Leaflet map tiles render completely
    await new Promise((r) => setTimeout(r, 1800));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "40px",
        bottom: "40px",
        left: "40px",
        right: "40px",
      },
    });

    await browser.close();

    // Filename: ClientName_CandidateName.pdf
    const rawClient = client.companyShortName || client.companyName || inv.clientName || "Client";
    const rawCandidate = inv.candidateName || "Candidate";
    const safeClient = rawClient.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    const safeCandidate = rawCandidate.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeClient}_${safeCandidate}.pdf"`,
      "Content-Length": pdf.length,
    });

    res.send(pdf);
  } catch (err) {
    console.error("PDF ERROR:", err);
    if (browser) await browser.close();
    res.status(500).send("Failed to generate PDF");
  }
});

function generateHTML(sub, images) {
  const inv = sub.invite || {};
  const client = sub.clientId || {};

  const companyName = client.companyName || inv.clientName || "MNR Solutions Private Limited";
  const shortName = client.companyShortName || companyName.split(" ")[0] || "MNR";

  const lat = Number(sub.location?.lat);
  const lng = Number(sub.location?.lng);
  const accuracy = Number(sub.location?.accuracy) || 30;

  // Map Rendering: If validGoogleMapBase64 succeeded, show it; otherwise render live detailed phone-style map
  const mapHTML = !lat || !lng
    ? `<p style="color:#999">Map snapshot not available</p>`
    : images.validGoogleMapBase64
    ? `<img id="map-image" src="${images.validGoogleMapBase64}" style="width:100%; height:220px; object-fit:cover; border:1px solid #aaa; border-radius:6px; margin-top:8px;" />`
    : `
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <div id="pdf-map" style="width:100%; height:220px; border:1px solid #aaa; border-radius:6px; margin-top:8px;"></div>
      <script>
        var map = L.map('pdf-map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 17);
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(map);
        L.circle([${lat}, ${lng}], { radius: ${Math.max(accuracy, 25)}, color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.15, weight: 2 }).addTo(map);
        L.circleMarker([${lat}, ${lng}], { radius: 8, color: '#fff', weight: 2, fillColor: '#d50000', fillOpacity: 1 }).addTo(map);
      </script>
    `;

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
  object-fit: contain;
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

/* ORIGINAL 3-COLUMN 1:1 PHOTO GRID */
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
  pointer-events: none;
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

<div class="watermark">${shortName.toUpperCase()} VERIFIED</div>

<header>
  <div class="header-left">
    ${images.logoSrc ? `<img src="${images.logoSrc}" />` : ""}
    <div>
      <h1>${companyName}</h1>
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
    <tr><td class="label">Client Name</td><td>${companyName}</td></tr>
    <tr><td class="label">Candidate Name</td><td>${inv.candidateName || "—"}</td></tr>
    <tr><td class="label">Mobile</td><td>${inv.candidateMobile || "—"}</td></tr>
    <tr><td class="label">Reference ID</td><td>${inv.referenceId || "—"}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Address Details</h2>
  <table>
    <tr><td class="label">Address</td><td>${inv.fullAddress || "—"}</td></tr>
    <tr><td class="label">District</td><td>${inv.district || "—"}</td></tr>
    <tr><td class="label">Pincode</td><td>${inv.pincode || "—"}</td></tr>
    <tr><td class="label">Ownership</td><td>${sub.ownership || "—"}</td></tr>
    <tr><td class="label">Verifier Name</td><td>${sub.verifiedPersonName || "—"}</td></tr>
    <tr><td class="label">Verifier Relation</td><td>${sub.verifiedByRelation || "—"}</td></tr>
    <tr><td class="label">Address Type</td><td>${sub.addressType || "—"}</td></tr>
    <tr><td class="label">Stay Period</td>
      <td>${sub.fromMonth || ""} ${sub.fromYear || ""} - ${sub.toMonth || ""} ${sub.toYear || ""}</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Location Verification</h2>
  <table>
    <tr><td class="label">Latitude</td><td>${sub.location?.lat || "-"}</td></tr>
    <tr><td class="label">Longitude</td><td>${sub.location?.lng || "-"}</td></tr>
    <tr><td class="label">Accuracy</td><td>${sub.location?.accuracy ? sub.location.accuracy + " m" : "-"}</td></tr>
    <tr><td class="label">Resolved Address</td><td>${sub.resolvedAddress || "-"}</td></tr>
  </table>
  ${mapHTML}
</div>

<div class="page-break"></div>

<div class="section">
  <h2>Photographic Evidence</h2>
  <div class="photos">
    ${imageBlock(images.houseSrc, "House Entrance")}
    ${imageBlock(images.selfieSrc, "Selfie with House")}
    ${imageBlock(images.idSrc, "ID Proof")}
    ${imageBlock(images.landmarkSrc, "Address Proof")}
  </div>
</div>

<div class="section">
  <h2>Candidate Signature</h2>
  ${
    images.sigSrc
      ? `<img src="${images.sigSrc}" style="width:100%;max-width:400px" />`
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

module.exports = router;