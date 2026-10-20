import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiPhoneCall } from "react-icons/fi";
import API from "../api/api";
import CameraCapture from "../components/CameraCapture";
import SignaturePad from "../components/SignaturePad";
import MapLeaflet from "../components/MapLeaflet";
import defaultLogo from "../assets/logo.png";

export default function CandidateForm() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);

  const [gps, setGps] = useState({ lat: null, lng: null, accuracy: null });
  const [resolvedAddress, setResolvedAddress] = useState("");

  const [houseBlob, setHouseBlob] = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [idBlob, setIdBlob] = useState(null);
  const [landmarkBlob, setLandmarkBlob] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const [form, setForm] = useState({
    ownership: "",
    addressType: "",
    fromMonth: "",
    fromYear: "",
    toMonth: "",
    toYear: "",
    verifiedByRelation: "",
    verifiedPersonName: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadInvite();
  }, []);

  async function loadInvite() {
    try {
      const res = await API.get(`/candidate/invite/${token}`);
      if (!res.data.invite) {
        window.location.href = "/thank-you";
        return;
      }
      setInvite(res.data.invite);
    } catch {
      window.location.href = "/thank-you";
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported.");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGps({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });

        // Free Nominatim Reverse Geocoding (or Geoapify if key present)
        try {
          const geoKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
          if (geoKey) {
            const r = await fetch(
              `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${geoKey}`
            );
            const j = await r.json();
            if (j.features?.length) {
              setResolvedAddress(j.features[0].properties.formatted);
              return;
            }
          }
          const osmRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const osmData = await osmRes.json();
          if (osmData?.display_name) setResolvedAddress(osmData.display_name);
        } catch {}
      },
      () => alert("Please allow location permission in your browser."),
      { enableHighAccuracy: true }
    );
  }

  function updateForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submitForm() {
    for (let key of Object.keys(form)) {
      if (!form[key]) return alert(`Please fill ${key}`);
    }
    if (!gps.lat || !gps.lng) return alert("Please allow GPS location access");
    if (!houseBlob || !selfieBlob || !idBlob || !landmarkBlob) {
      return alert("All 4 photos are mandatory");
    }
    if (!signatureDataUrl) return alert("Signature is mandatory");

    setLoading(true);
    setUploadProgress(5);

    try {
      const fd = new FormData();
      Object.keys(form).forEach((key) => fd.append(key, form[key]));
      fd.append("lat", gps.lat);
      fd.append("lng", gps.lng);
      fd.append("accuracy", gps.accuracy);
      fd.append("resolvedAddress", resolvedAddress);

      fd.append("houseEntrance", houseBlob, "house.jpg");
      fd.append("selfieWithHouse", selfieBlob, "selfie.jpg");
      fd.append("idPhoto", idBlob, "id.jpg");
      fd.append("landmarkPhoto", landmarkBlob, "landmark.jpg");
      fd.append("signature", signatureDataUrl);

      await API.post(`/submissions/submit/${token}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) {
            const pct = Math.round((ev.loaded * 100) / ev.total);
            setUploadProgress(pct >= 95 ? 95 : pct);
          }
        },
      });

      setUploadProgress(100);
      setTimeout(() => {
        window.location.href = "/thank-you";
      }, 400);
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const brandName = invite?.clientBranding?.companyName || invite?.clientName || "Address Verification";
  const brandLogo = invite?.clientBranding?.companyLogo || defaultLogo;
  const supportPhone = invite?.clientBranding?.supportPhone;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 55 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* WHITE-LABEL NAVBAR */}
      <nav className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#0B8A42]">
                {brandName}
              </h1>
              <p className="text-xs text-gray-500">Digital Address Verification</p>
            </div>
          </div>

          {supportPhone && (
            <a
              href={`tel:${supportPhone}`}
              className="flex items-center gap-2 bg-[#D4A017] text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow"
            >
              <FiPhoneCall />
              <span>Help</span>
            </a>
          )}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-4 space-y-6 pb-10">
        {!invite ? (
          <div className="p-8 text-center">Loading verification form...</div>
        ) : (
          <>
            {/* CANDIDATE SUMMARY */}
            <div className="bg-white p-5 rounded-xl shadow border space-y-3">
              <h2 className="text-lg font-bold text-[#0B8A42]">
                Candidate Verification Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="text-gray-500 text-xs block">Requested By</span>
                  <strong>{brandName}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="text-gray-500 text-xs block">Candidate Name</span>
                  <strong>{invite.candidateName}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="text-gray-500 text-xs block">Mobile Number</span>
                  <strong>{invite.candidateMobile}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="text-gray-500 text-xs block">Registered Address</span>
                  <strong>{invite.fullAddress} ({invite.pincode})</strong>
                </div>
              </div>
            </div>

            {/* STAY & ADDRESS FORM */}
            <div className="bg-white p-5 rounded-xl shadow border">
              <h2 className="text-lg font-bold text-[#0B8A42] mb-4">Address & Stay Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold">Ownership *</label>
                  <select name="ownership" value={form.ownership} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Ownership</option>
                    <option value="Owner">Owner</option>
                    <option value="Rented">Rented</option>
                    <option value="PG / Hostel">PG / Hostel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Address Type *</label>
                  <select name="addressType" value={form.addressType} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Type</option>
                    <option value="Current">Current Address</option>
                    <option value="Permanent">Permanent Address</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">From Month *</label>
                  <select name="fromMonth" value={form.fromMonth} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Month</option>
                    {months.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">From Year *</label>
                  <select name="fromYear" value={form.fromYear} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Year</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">To Month *</label>
                  <select name="toMonth" value={form.toMonth} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Month</option>
                    {months.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">To Year *</label>
                  <select name="toYear" value={form.toYear} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Year</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Verified By (Relation) *</label>
                  <select name="verifiedByRelation" value={form.verifiedByRelation} onChange={updateForm} className="form-input mt-1">
                    <option value="">Select Relation</option>
                    <option value="Self">Self</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Landlord">Landlord</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Respondent Name *</label>
                  <input
                    name="verifiedPersonName"
                    placeholder="Enter full name"
                    value={form.verifiedPersonName}
                    onChange={updateForm}
                    className="form-input mt-1"
                  />
                </div>
              </div>
            </div>

            {/* LIVE LOCATION (FREE LEAFLET MAP) */}
            <div className="bg-white p-5 rounded-xl shadow border">
              <h2 className="text-lg font-bold text-[#0B8A42] mb-3">Live GPS Location</h2>
              <button
                type="button"
                onClick={requestLocation}
                className="bg-[#0B8A42] text-white px-4 py-2 rounded-lg font-medium shadow"
              >
                Capture GPS Location
              </button>

              {gps.lat && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs bg-gray-50 p-3 rounded border">
                    <strong>Coordinates:</strong> {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (Accuracy: {gps.accuracy}m)
                    <br />
                    <strong>Detected Address:</strong> {resolvedAddress || "Fetching..."}
                  </div>
                  <div className="w-full h-64 rounded-lg overflow-hidden border">
                    <MapLeaflet lat={gps.lat} lng={gps.lng} />
                  </div>
                </div>
              )}
            </div>

            {/* 4 CAMERA PHOTOS */}
            <div className="bg-white p-5 rounded-xl shadow border">
              <h2 className="text-lg font-bold text-[#0B8A42] mb-4">Capture Live Photographs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2">1. House Entrance *</p>
                  <CameraCapture onCapture={setHouseBlob} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">2. Selfie with House *</p>
                  <CameraCapture onCapture={setSelfieBlob} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">3. ID Proof *</p>
                  <CameraCapture onCapture={setIdBlob} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">4. Nearby Landmark *</p>
                  <CameraCapture onCapture={setLandmarkBlob} />
                </div>
              </div>
            </div>

            {/* SIGNATURE */}
            <div className="bg-white p-5 rounded-xl shadow border">
              <SignaturePad onChange={setSignatureDataUrl} />
            </div>

            {/* SUBMIT */}
            <button
              onClick={submitForm}
              disabled={loading}
              className="w-full bg-[#0B8A42] text-white py-4 rounded-xl font-bold text-lg shadow-lg"
            >
              {loading ? `Submitting (${uploadProgress}%)...` : "Submit Verification"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}