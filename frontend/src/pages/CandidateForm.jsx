import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { FiPhoneCall } from "react-icons/fi";
import API from "../api/api";
import CameraCapture from "../components/CameraCapture";
import SignaturePad from "../components/SignaturePad";
import MapLeaflet from "../components/MapLeaflet";
import leafletImage from "leaflet-image";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CandidateForm() {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
  });

  const { token } = useParams();
  const [invite, setInvite] = useState(null);

  const [gps, setGps] = useState({ lat: null, lng: null, accuracy: null });
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [distanceToCenter, setDistanceToCenter] = useState(null);
  const [isInsideRadius, setIsInsideRadius] = useState(true);

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
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadInvite();
  }, []);

  async function loadInvite() {
    try {
      const res = await API.get(`/candidate/invite/${token}`);
      const inv = res.data.invite;

      if (!inv || inv.tokenDisabled) {
        window.location.href = "/thank-you";
        return;
      }

      setInvite(inv);
    } catch {
      window.location.href = "/thank-you";
    }
  }

  async function requestLocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported.");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGps({ lat: latitude, lng: longitude, accuracy });

        // reverse geocode
        try {
          const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${
            import.meta.env.VITE_GEOAPIFY_API_KEY
          }`;
          const r = await fetch(url);
          const j = await r.json();
          if (j.features?.length) {
            setResolvedAddress(j.features[0].properties.formatted);
          }
        } catch {}

        if (invite?.center?.lat && invite?.center?.lng && invite?.radius) {
          const dist = haversineDistance(
            invite.center.lat,
            invite.center.lng,
            latitude,
            longitude
          );
          setDistanceToCenter(dist);
          setIsInsideRadius(dist <= invite.radius);
        }
      },
      (err) => alert("Location permission denied."),
      { enableHighAccuracy: true }
    );
  }

  function generateMapSnapshot() {
    return new Promise((resolve, reject) => {
      if (!mapRef.current) {
        return reject("Map not ready");
      }

      leafletImage(mapRef.current, (err, canvas) => {
        if (err) return reject(err);

        canvas.toBlob(async (blob) => {
          if (!blob) return reject("Empty canvas");

          try {
            const fd = new FormData();
            fd.append("file", blob);
            fd.append("upload_preset", "lions_maps");

            const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
              {
                method: "POST",
                body: fd,
              }
            );

            const data = await res.json();

            if (!data.secure_url) {
              reject("Cloudinary upload failed");
            }

            resolve(data.secure_url);
          } catch (e) {
            reject(e);
          }
        }, "image/png");
      });
    });
  }

  function updateForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validateForm() {
  const requiredFields = [
    "ownership",
    "addressType",
    "fromMonth",
    "fromYear",
    "toMonth",
    "toYear",
    "verifiedByRelation",
    "verifiedPersonName",
  ];

  for (let field of requiredFields) {
    if (!form[field] || form[field].trim() === "") {
      alert(`Please fill ${field.replace(/([A-Z])/g, " $1")}`);
      return false;
    }
  }

  if (!gps.lat || !gps.lng) {
    alert("Please allow location access");
    return false;
  }

  if (!houseBlob || !selfieBlob || !idBlob || !landmarkBlob) {
    alert("All 4 photos are mandatory");
    return false;
  }

  if (!signatureDataUrl) {
    alert("Signature is mandatory");
    return false;
  }

  return true;
}


  async function submitForm() {
  if (!validateForm()) return;

  if (!mapReady) {
    alert("Map is still loading. Please wait 2–3 seconds.");
    return;
  }


    if (!gps.lat || !gps.lng) {
      alert("Location required.");
      return;
    }

    if (!houseBlob || !selfieBlob || !idBlob || !landmarkBlob) {
      alert("All 4 photos are required.");
      return;
    }

    if (!signatureDataUrl) {
      alert("Signature is required.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const mapImageUrl = await generateMapSnapshot();

      const fd = new FormData();
      Object.keys(form).forEach((key) => fd.append(key, form[key]));

      fd.append("lat", gps.lat);
      fd.append("lng", gps.lng);
      fd.append("accuracy", gps.accuracy);
      fd.append("resolvedAddress", resolvedAddress);
      fd.append("mapImageUrl", mapImageUrl);

      fd.append("houseEntrance", houseBlob, "house.jpg");
      fd.append("selfieWithHouse", selfieBlob, "selfie.jpg");
      fd.append("idPhoto", idBlob, "id.jpg");
      fd.append("landmarkPhoto", landmarkBlob, "landmark.jpg");
      fd.append("signature", signatureDataUrl);

      setLoading(true);
      setUploadProgress(1);

      await API.post(`/submissions/submit/${token}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percent >= 95 ? 95 : percent);
          }
        },
      });

      setUploadProgress(100);

      setTimeout(() => {
        window.location.href = "/thank-you";
      }, 400);
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <nav className="w-full bg-white border-b border-gray-200 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          {/* LEFT — LOGO + TEXT */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/logo.png"
              alt="MNR Logo"
              className="h-9 w-9 sm:h-12 sm:w-12 object-contain"
            />

            <div className="leading-tight">
              {/* Desktop Title */}
              <h1 className="hidden sm:block text-xl font-bold text-[#0B8A42]">
                MNR Digital Address
              </h1>

              {/* Mobile Title */}
              <h1 className="block sm:hidden text-lg font-bold text-[#0B8A42]">
                MNR
              </h1>

              {/* Subtitle — Desktop only */}
              <p className="hidden sm:block text-xs text-gray-500 -mt-1 tracking-wide">
                Verified Location Capture System
              </p>
            </div>
          </div>

          {/* RIGHT — SUPPORT CALL BUTTON */}
          <a
            href="tel:+91#"
            className="
        flex items-center gap-2
        bg-[#D4A017] text-white
        px-3 py-2 sm:px-4
        rounded-full shadow
        hover:bg-[#b79214]
        active:scale-95
        transition
        text-sm sm:text-base
      "
          >
            <FiPhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-semibold whitespace-nowrap">
              Need help? Call me
            </span>
          </a>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 mt-4 space-y-6 overflow-x-hidden">
        {!invite ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="w-full bg-white shadow-md border border-gray-200 rounded-xl mt-4 box-border">
              <div className="w-full px-4 py-4 sm:px-5 sm:py-6 box-border">
                <h2 className="text-lg sm:text-xl font-bold text-[#0B8A42] mb-3 sm:mb-4">
                  Candidate Verification Details
                </h2>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border w-full box-border">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Verification Requested By
                    </p>
                    <h3 className="text-base font-semibold break-words">
                      {invite?.clientName}
                    </h3>
                    <p className="text-xs text-gray-600 break-words">
                      {invite?.organization}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border w-full box-border">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Verification Partner
                    </p>
                    <h3 className="text-base font-semibold text-[#0B8A42] break-words">
                      Lions Digital Verification Team
                    </h3>
                    <p className="text-xs text-gray-600">
                      Trusted Address Validation
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border w-full box-border">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Candidate Name
                    </p>
                    <h3 className="text-base font-semibold break-words">
                      {invite?.candidateName}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border w-full box-border">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Candidate Mobile
                    </p>
                    <h3 className="text-base font-semibold break-all">
                      {invite?.candidateMobile}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border w-full box-border">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Registered Address
                    </p>
                    <h3 className="text-sm font-semibold break-words">
                      {invite?.fullAddress}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Pincode: {invite?.pincode}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ADDRESS DETAILS SECTION */}
            <div className="bg-white border border-gray-200 shadow-md rounded-xl mt-8 w-full">
              <div className="max-w-5xl mx-auto px-5 py-6 w-full">
                <h2 className="text-xl font-bold text-[#0B8A42] mb-4">
                  Address Details
                </h2>

                <p className="text-gray-600 text-sm mb-6">
                  Please provide accurate details about your stay at the given
                  address. All fields are mandatory.
                </p>

                {/* MONTHS + YEARS DATA */}
                {(() => {
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];

                  // Generate years from 1940 → current year
                  const currentYear = new Date().getFullYear();
                  let years = [];
                  for (let y = currentYear; y >= 1970; y--) years.push(y);

                  return (
                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Ownership */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Ownership <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="ownership"
                          required
                          value={form.ownership}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Ownership</option>
                          <option value="owner">Owner</option>
                          <option value="rented">Rented</option>
                          <option value="pg">PG / Hostel</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Address Type */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Address Type <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="addressType"
                          required
                          value={form.addressType}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Type</option>
                          <option value="current">Current</option>
                          <option value="permanent">Permanent</option>
                          <option value="office">Office</option>
                        </select>
                      </div>

                      {/* FROM MONTH */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          From Month <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="fromMonth"
                          required
                          value={form.fromMonth}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Month</option>
                          {months.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* FROM YEAR */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          From Year <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="fromYear"
                          required
                          value={form.fromYear}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Year</option>
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* TO MONTH */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          To Month <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="toMonth"
                          required
                          value={form.toMonth}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Month</option>
                          {months.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* TO YEAR */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          To Year <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="toYear"
                          required
                          value={form.toYear}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Year</option>
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* VERIFIED BY RELATION */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Verified By (Relation){" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="verifiedByRelation"
                          required
                          value={form.verifiedByRelation}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        >
                          <option value="">Select Relation</option>
                          <option value="self">Self</option>
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="brother">Brother</option>
                          <option value="relative">Relative</option>
                          <option value="landlord">Landlord</option>
                        </select>
                      </div>

                      {/* VERIFIED PERSON NAME */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Verified Person Name{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="verifiedPersonName"
                          placeholder="Enter Name"
                          required
                          value={form.verifiedPersonName}
                          onChange={updateForm}
                          className="border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-[#D4A017]"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>


            {/* LOCATION ACCESS SECTION */}
            <div className="bg-white shadow-md border border-gray-200 rounded-xl mt-6">
              <div className="max-w-5xl mx-auto px-5 py-6">
                <h2 className="text-xl font-bold text-[#0B8A42] mb-4">
                  Live Location Verification
                </h2>

                {/* Allow Location Button */}
                <button
                  onClick={requestLocation}
                  className="bg-[#0B8A42] text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition active:scale-95"
                >
                  Allow Location Access
                </button>

                {/* If location not allowed yet */}
                {!gps.lat && (
                  <p className="text-sm text-gray-500 mt-3">
                    Tap the button above and allow GPS permission to continue
                    verification.
                  </p>
                )}

                {/* After location is fetched */}
                {gps.lat && (
                  <div className="mt-5 bg-gray-50 p-4 rounded-lg border space-y-3">
                    {/* Address */}
                    <div>
                      <p className="text-gray-500 text-sm">Resolved Address</p>
                      <h3 className="text-base font-semibold text-gray-800">
                        {resolvedAddress || "Fetching address..."}
                      </h3>
                    </div>

                    {/* Lat / Lng */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 border rounded">
                        <p className="text-gray-500 text-xs">Latitude</p>
                        <h3 className="font-semibold text-gray-700">
                          {gps.lat.toFixed(6)}
                        </h3>
                      </div>

                      <div className="bg-white p-3 border rounded">
                        <p className="text-gray-500 text-xs">Longitude</p>
                        <h3 className="font-semibold text-gray-700">
                          {gps.lng.toFixed(6)}
                        </h3>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-white p-3 border rounded">
                      <p className="text-gray-500 text-xs">GPS Accuracy</p>
                      <h3 className="font-semibold text-gray-700">
                        {gps.accuracy} meters
                      </h3>
                    </div>

                    {/* Distance to Invite Center */}
                    {distanceToCenter !== null && (
                      <div className="bg-white p-3 border rounded">
                        <p className="text-gray-500 text-xs">
                          Distance From Assigned Location
                        </p>

                        <h3
                          className={`font-semibold text-lg ${
                            isInsideRadius ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {Math.round(distanceToCenter)} meters —{" "}
                          {isInsideRadius
                            ? "Inside Allowed Radius"
                            : "Outside Allowed Radius"}
                        </h3>
                      </div>
                    )}

                    {/* MAP */}
                    <div className="w-full h-72 rounded-lg overflow-hidden border mt-3">
                      {/* <MapLeaflet lat={gps.lat} lng={gps.lng} /> */}
                      <MapLeaflet
                        lat={gps.lat}
                        lng={gps.lng}
                        onMapReady={(map) => {
                          mapRef.current = map;
                          setMapReady(true);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PHOTOS SECTION */}
            <div className="bg-white border border-gray-200 shadow-md rounded-xl mt-6">
              <div className="w-full px-3 sm:px-8 py-4 sm:py-6">
                <h2 className="text-lg sm:text-xl font-bold text-[#0B8A42] mb-4">
                  Capture Required Photos
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-bold">
                  {[
                    {
                      label: "House Photo",
                      blob: houseBlob,
                      setBlob: setHouseBlob,
                    },
                    {
                      label: "Selfie with House",
                      blob: selfieBlob,
                      setBlob: setSelfieBlob,
                    },
                    {
                      label: "Address Proof",
                      blob: idBlob,
                      setBlob: setIdBlob,
                    },
                    {
                      label: "ID Proof",
                      blob: landmarkBlob,
                      setBlob: setLandmarkBlob,
                    },
                  ].map(({ label, blob, setBlob }) => (
                    <div key={label} className="w-full">
                      {/* LABEL ON TOP */}
                      <p className="text-sm font-bold text-gray-700 mb-4 mt-2">
                        {label}
                      </p>

                      {/* CLICKABLE PREVIEW */}
                      <CameraCapture onCapture={(b) => setBlob(b)}>
                        <div
                          className="
                w-full aspect-[1/2]
                bg-gray-50
                border-2 border-dashed border-gray-300
                rounded-xl
                overflow-hidden
                flex items-center justify-center
                cursor-pointer
                active:scale-[0.98]
                transition
              "
                        >
                          {!blob ? (
                            <span className="text-xs text-gray-400 text-center px-2">
                              Tap to capture photo
                            </span>
                          ) : (
                            <img
                              src={URL.createObjectURL(blob)}
                              alt={label}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </CameraCapture>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SIGNATURE SECTION */}
<div className="bg-white border border-gray-200 shadow-md rounded-xl mt-6 sm:mt-8 w-full">
  <div className="w-full px-3 sm:px-5 py-4 sm:py-6">

    <h2 className="text-lg sm:text-xl font-bold text-[#0B8A42] mb-2 sm:mb-3">
      Signature Verification
    </h2>

    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
      Please sign clearly inside the box below. Signature is mandatory.
    </p>

    {/* SIGNATURE PAD */}
    <div className="w-full">
      <div className="w-full bg-white overflow-hidden">

        <SignaturePad
          onChange={(sig) => setSignatureDataUrl(sig)}
          canvasProps={{
            className:
              "w-full h-[200px] sm:h-[260px] md:h-[300px] lg:h-[340px] touch-none",
          }}
        />

      </div>

      {/* MOBILE HINT */}
      <p className="text-[11px] text-gray-500 mt-2 text-center">
        Use your finger to sign clearly
      </p>
    </div>

  </div>
</div>

            
            {/* REVIEW & SUBMIT SECTION */}
            <div className="bg-white border border-gray-200 shadow-md rounded-xl mt-8 w-full">
              <div className="max-w-5xl mx-auto px-5 py-6 w-full">
                <h2 className="text-xl font-bold text-[#0B8A42] mb-4">
                  Review Your Details
                </h2>

                <p className="text-gray-600 text-sm mb-6">
                  Please check all details carefully before submitting. Once
                  submitted, changes can only be made by the verification
                  partner.
                </p>

                {/* SUMMARY BOX */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Summary of Information
                  </h3>

                  <ul className="text-gray-700 text-sm space-y-2">
                    <li>
                      <strong>Ownership:</strong> {form.ownership || "—"}
                    </li>
                    <li>
                      <strong>Address Type:</strong> {form.addressType || "—"}
                    </li>
                    <li>
                      <strong>Stay Duration:</strong> {form.fromMonth}{" "}
                      {form.fromYear} → {form.toMonth} {form.toYear}
                    </li>
                    <li>
                      <strong>Verified By:</strong>{" "}
                      {form.verifiedByRelation || "—"}
                    </li>
                    <li>
                      <strong>Verified Person Name:</strong>{" "}
                      {form.verifiedPersonName || "—"}
                    </li>
                    <li>
                      <strong>Resolved Address:</strong>{" "}
                      {resolvedAddress || "—"}
                    </li>
                    {gps.lat && (
                      <li>
                        <strong>Coordinates:</strong> {gps.lat.toFixed(6)},{" "}
                        {gps.lng.toFixed(6)}
                        <br />
                        <strong>Accuracy:</strong> {gps.accuracy} m
                      </li>
                    )}
                  </ul>
                </div>

                {/* Submission Rules */}
                <div className="text-sm text-gray-600 mb-6 leading-relaxed">
                  <p className="mb-2">✔ All fields are mandatory.</p>
                  <p className="mb-2">✔ Make sure photos are clear.</p>
                  <p className="mb-2">
                    ✔ Signature must match your legal documents.
                  </p>
                  <p className="mb-1 text-red-600 font-medium">
                    ✘ Submitting false information may lead to rejection.
                  </p>
                </div>

                {/* SUBMIT BUTTON */}
                {loading && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                <button
                  onClick={submitForm}
                  disabled={loading}
                  className="relative w-full bg-[#0B8A42] text-white py-4 rounded-xl font-semibold overflow-hidden"
                >
                  {/* PROGRESS BAR INSIDE BUTTON */}
                  {loading && (
                    <div
                      className="absolute left-0 top-0 h-full bg-[#D4A017] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}

                  {/* BUTTON TEXT */}
                  <span className="relative z-10">
                    {loading
                      ? `Uploading... ${uploadProgress}%`
                      : "Submit Verification"}
                  </span>
                </button>

                {/* Footer Note */}
                <p className="text-xs text-center text-gray-500 mt-3">
                  By submitting, you agree that all information provided is
                  true.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white text-center py-4 text-sm text-gray-500 border-t mt-4">
        © {new Date().getFullYear()} MNR Solutions Private Limited • All Rights Reserved
      </footer>
    </div>
  );
}
