import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { useParams } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import API from "../api/api";
import { toast } from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import useConfirmModal from "../hooks/useConfirmModal";
import {
  FaDownload,
  FaCheck,
  FaTimes,
  FaSave,
  FaTrash,
  FaCopy,
  FaWhatsapp,
} from "react-icons/fa";
import "leaflet/dist/leaflet.css";

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function ViewSubmission() {
  const [confirmReject, setConfirmReject] = useState(false);
  const [reason, setReason] = useState("");
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState(null); // submission object
  const [invite, setInvite] = useState(null); // invite object (if populated)
  const [editableInvite, setEditableInvite] = useState(null); // admin-editable invite fields
  const [candidateFields, setCandidateFields] = useState({
    ownership: "",
    addressType: "",
    fromMonth: "",
    fromYear: "",
    toMonth: "",
    toYear: "",
    verifiedByRelation: "",
    verifiedPersonName: "",
  }); // editable fields filled by candidate (now editable to admin)
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rejectedInfo, setRejectedInfo] = useState(null); // { reason, link, mobile } after reject
  const [resendLoading, setResendLoading] = useState(false);
  const { confirmData, askConfirmation, closeConfirm } = useConfirmModal();

  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line
  }, [id]);

  async function loadSubmission() {
    setLoading(true);
    try {
      const res = await API.get(`/submissions/${id}`);
      const submission = res.data.submission;
      setSub(submission);

      // invite may be populated inside submission
      if (submission?.invite) {
        setInvite(submission.invite);
        setEditableInvite({
          _id: submission.invite._id,
          clientName: submission.invite.clientName || "",
          organization: submission.invite.organization || "",
          referenceId: submission.invite.referenceId || "",
          // We don't allow editing candidateName/mobile/email fields that candidate filled later.
        });
      } else if (submission?.inviteId) {
        // try fetching invite by id
        try {
          const inv = await API.get(`/invites/invite/${submission.inviteId}`);
          setInvite(inv.data.invite);
          setEditableInvite({
            _id: inv.data.invite._id,
            clientName: inv.data.invite.clientName || "",
            organization: inv.data.invite.organization || "",
            referenceId: inv.data.invite.referenceId || "",
          });
        } catch (e) {
          // ignore — invite may not be available
        }
      }

      // candidate filled fields: try multiple possible locations in submission
      // We'll search common property names and fallback to empty strings
      const cand = {
        ownership:
          submission.ownership ||
          submission.address?.ownership ||
          submission.addressDetails?.ownership ||
          submission.candidateFields?.ownership ||
          "",
        addressType:
          submission.addressType ||
          submission.address?.type ||
          submission.addressDetails?.type ||
          submission.candidateFields?.addressType ||
          "",
        fromMonth:
          submission.fromMonth ||
          submission.addressDetails?.fromMonth ||
          submission.candidateFields?.fromMonth ||
          "",
        fromYear:
          submission.fromYear ||
          submission.addressDetails?.fromYear ||
          submission.candidateFields?.fromYear ||
          "",
        toMonth:
          submission.toMonth ||
          submission.addressDetails?.toMonth ||
          submission.candidateFields?.toMonth ||
          "",
        toYear:
          submission.toYear ||
          submission.addressDetails?.toYear ||
          submission.candidateFields?.toYear ||
          "",
        verifiedByRelation:
          submission.verifiedByRelation ||
          submission.addressDetails?.verifiedByRelation ||
          submission.candidateFields?.verifiedByRelation ||
          "",
        verifiedPersonName:
          submission.verifiedPersonName ||
          submission.addressDetails?.verifiedPersonName ||
          submission.candidateFields?.verifiedPersonName ||
          "",
      };

      setCandidateFields(cand);

      setAccepted(submission.status === "accepted");
      setRejectedInfo(
        submission.status === "rejected"
          ? {
              reason: submission.rejectReason || "—",
              link: submission.regeneratedLink || null,
              mobile:
                (submission.invite && submission.invite.candidateMobile) ||
                submission.candidateMobile ||
                null,
            }
          : null
      );
    } catch (err) {
      console.error("loadSubmission error:", err);
      alert("Failed to load submission. Check console.");
    } finally {
      setLoading(false);
    }
  }



  // --------------- Save candidate-filled address fields ----------------
  async function handleSaveCandidateFields() {
    setSavingCandidate(true);
    try {
      const payload = { candidateFields };
      await API.put(`/submissions/update/${sub._id}`, payload);
      toast.success("Address details saved");
      await loadSubmission();
    } catch (err) {
      console.error("save candidate fields error", err);
      toast.error("Failed to save fields");
    } finally {
      setSavingCandidate(false);
    }
  }

  // --------------- Accept submission ----------------
function handleAccept() {
  askConfirmation({
    title: "Accept Submission",
    message:
      "Are you sure you want to mark this submission as ACCEPTED?",
    onConfirm: async () => {
      const toastId = toast.loading("Accepting submission...");

      try {
        await API.post(`/submissions/accept/${sub._id}`);

        toast.dismiss(toastId);
        toast.success("Submission accepted successfully");

        await loadSubmission();
      } catch (err) {
        console.error("Accept error:", err);
        toast.dismiss(toastId);
        toast.error("Accept failed");
      } finally {
        closeConfirm();
      }
    },
  });
}


  // --------------- Reject submission ----------------

  async function handleRejectConfirmed() {
    if (!reason.trim()) {
      toast.error("Please enter reason");
      return;
    }

    try {
      const res = await API.post(`/submissions/reject/${sub._id}`, { reason });
      toast.success("Submission rejected");

      setRejectedInfo({
        reason,
        link: res?.data?.link || null,
        mobile: invite?.candidateMobile || sub.candidateMobile,
      });

      await loadSubmission();
    } catch (err) {
      toast.error("Reject failed");
    } finally {
      setConfirmReject(false);
    }
  }

  // --------------- Resend invite (via backend or fallback) ----------------
  async function handleResend() {
    if (!invite?._id && !rejectedInfo?.link) {
      alert("No invite link available to resend.");
      return;
    }

    if (!window.confirm("Resend invite via WhatsApp to candidate?")) return;
    setResendLoading(true);
    try {
      // Prefer backend route
      if (invite?._id) {
        const res = await API.post(`/invites/resend/${invite._id}`, {});
        if (res?.data?.whatsappURL) {
          window.open(res.data.whatsappURL, "_blank");
        } else if (res?.data?.link) {
          const link = res.data.link;
          window.open(
            `https://wa.me/${invite.candidateMobile}?text=${encodeURIComponent(
              "Verification required: " +
                link +
                (rejectedInfo?.reason ? `\nReason: ${rejectedInfo.reason}` : "")
            )}`,
            "_blank"
          );
        } else {
          alert(
            "Resend requested on server. If nothing opened, fallback will be used."
          );
          // fallback to constructed link below
        }
      }

      // fallback: use regenerated link or invite.token
      const CLIENT_URL = import.meta.env.CLIENT_URL || "https://mnr-digital-address.vercel.app";

      const link =
        rejectedInfo?.link || `${CLIENT_URL}/verify/${invite?.token}`;

      const mobile =
        invite?.candidateMobile || rejectedInfo?.mobile || sub.candidateMobile;

      if (link && mobile) {
        window.open(
          `https://wa.me/${mobile}?text=${encodeURIComponent(
            "Please complete your verification:\n" +
              link +
              (rejectedInfo?.reason ? `\n\nReason: ${rejectedInfo.reason}` : "")
          )}`,
          "_blank"
        );
      }
    } catch (err) {
      console.error("resend error", err);
      alert("Resend failed. Check backend or open link manually.");
    } finally {
      setResendLoading(false);
    }
  }

  // --------------- Delete submission ----------------
  function handleDeleteSubmission() {
    askConfirmation({
      title: "Delete Submission",
      message: "This submission will be deleted permanently. Continue?",
      onConfirm: async () => {
        try {
          await API.delete(`/submissions/delete/${sub._id}`);
          toast.success("Deleted");
          window.location.href = "/admin/submissions";
        } catch {
          toast.error("Delete failed");
        }
        closeConfirm();
      },
    });
  }

  function onCandidateFieldChange(e) {
    const { name, value } = e.target;
    setCandidateFields((p) => ({ ...p, [name]: value }));
  }

  if (loading || !sub) {
    return (
      <AdminLayout>
        <div className="p-6">Loading submission...</div>
      </AdminLayout>
    );
  }

  // compute lat/lng/accuracy
  const lat = Number(sub.location?.lat ?? sub.location?.latitude ?? null);
  const lng = Number(sub.location?.lng ?? sub.location?.longitude ?? null);
  const acc = sub.location?.accuracy ?? sub.location?.accuracyMeters ?? "";

  function copy(text) {
    navigator.clipboard.writeText(text);
    toast.success("Link Copied!", {
      style: { background: "#D4A017", color: "white" },
    });
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              Capture Report
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              Ref:{" "}
              <span className="font-medium">
                {invite?.referenceId || sub.referenceId || "—"}
              </span>
              {"  "}•{"  "}
              <span className="text-gray-500">
                Report Date: {fmt(sub.createdAt)}
              </span>
            </div>

            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 text-sm rounded-full ${
                  sub.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : sub.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {sub.status ? sub.status.toUpperCase() : "PENDING"}
              </span>
            </div>
          </div>

          {/* <div className="flex items-start gap-2">
            {sub.status === "accepted" && (
              <a
              href={`https://lions-digital-address.up.railway.app/api/pdf/submission/${sub._id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
            >
              Download PDF
            </a>
            )}
          </div> */}
        </div>

        {/* Invite Details */}
        <div className="bg-white border border-gray-300 shadow-xl rounded p-8">
          <h2 className="text-xl font-semibold mb-6">Invite Details</h2>

          {editableInvite ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                <div>
                  <label className="form-label">Client Name</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.clientName}
                  />
                </div>

                <div>
                  <label className="form-label">Organization</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.organization}
                  />
                </div>

                <div>
                  <label className="form-label">Candidate Name</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.candidateName}
                  />
                </div>

                <div>
                  <label className="form-label">Candidate Email</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.candidateEmail}
                  />
                </div>

                <div>
                  <label className="form-label">Reference ID</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.referenceId}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                <div>
                  <label className="form-label">Candidate Mobile</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.candidateMobile}
                  />
                </div>

                <div>
                  <label className="form-label">Full Address</label>
                  <textarea
                    disabled
                    rows="5"
                    className="form-input bg-gray-100"
                    value={invite?.fullAddress}
                  ></textarea>
                </div>

                <div>
                  <label className="form-label">District</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.district}
                  />
                </div>

                <div>
                  <label className="form-label">Pincode</label>
                  <input
                    disabled
                    className="form-input bg-gray-100"
                    value={invite?.pincode}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Invite data unavailable</p>
          )}
        </div>

        {/* Candidate-filled fields (editable for admin): Ownership, Address Type, From/To, Verified By, Name */}
        <div className="bg-white border rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Address Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Ownership</label>
              <select
                name="ownership"
                value={candidateFields.ownership}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
              >
                <option value="">Select ownership</option>
                <option value="owner">Owner</option>
                <option value="rented">Rented</option>
                <option value="pg">PG / Hostel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Address Type</label>
              <select
                name="addressType"
                value={candidateFields.addressType}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
              >
                <option value="">Select type</option>
                <option value="current">Current</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">From (Month)</label>
              <input
                name="fromMonth"
                value={candidateFields.fromMonth}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
                placeholder="e.g. January"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">From (Year)</label>
              <input
                name="fromYear"
                value={candidateFields.fromYear}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
                placeholder="e.g. 2019"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">To (Month)</label>
              <input
                name="toMonth"
                value={candidateFields.toMonth}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
                placeholder="e.g. December"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">To (Year)</label>
              <input
                name="toYear"
                value={candidateFields.toYear}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
                placeholder="e.g. 2025"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Verified By (Relation)
              </label>
              <select
                name="verifiedByRelation"
                value={candidateFields.verifiedByRelation}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
              >
                <option value="">Select</option>
                <option value="self">Self</option>
                <option value="friend">Friend</option>
                <option value="family">Family</option>
                <option value="neighbour">Neighbour</option>
                <option value="landlord">Landlord</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Verified Person Name
              </label>
              <input
                name="verifiedPersonName"
                value={candidateFields.verifiedPersonName}
                onChange={onCandidateFieldChange}
                className="w-full border rounded p-2 mt-1"
                placeholder="Name"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={handleSaveCandidateFields}
              disabled={savingCandidate}
              className="inline-flex items-center gap-2 bg-[#0B8A42] text-white px-3 py-2 rounded shadow"
            >
              <FaSave /> Save
            </button>
          </div>
        </div>

        {/* Address + Location merged */}
        <div className="bg-white border rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Address & Location</h3>

            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-gray-600 w-48">Full Address</td>
                  <td className="py-2 font-medium">
                    {invite?.fullAddress || sub.resolvedAddress || "—"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-600">District</td>
                  <td className="py-2 font-medium">
                    {invite?.district || sub.district || "-"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-600">Pincode</td>
                  <td className="py-2 font-medium">
                    {invite?.pincode || sub.pincode || "-"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-600">Latitude / Longitude</td>
                  <td className="py-2 font-medium">
                    {lat ?? "-"} , {lng ?? "-"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-600">Accuracy</td>
                  <td className="py-2 font-medium">{acc ? `${acc} m` : "-"}</td>
                </tr>
                {sub.resolvedAddress && (
                  <tr>
                    <td className="py-2 text-gray-600">Resolved Address</td>
                    <td className="py-2 font-medium">{sub.resolvedAddress}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Full-width map */}
            <div className="w-full h-72 md:h-96">
              {lat && lng ? (
                <MapContainer
                  center={[lat, lng]}
                  zoom={16}
                  className="h-64 w-full rounded"
                  whenReady={(e) => {
                    mapRef.current = e.target;
                    setMapReady(true);
                    console.log("✅ Map is ready");
                  }}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[lat, lng]} />
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 border rounded">
                  Map not available (no coordinates)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photos (2 per row) + Landmark + Signature full width */}
        <div className="bg-white border rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Photos, ID & Signature</h3>

          {/* 2-column grid for photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* House Entrance */}
            <div className="border bg-gray-100 rounded">
              <div className="text-sm text-gray-500 mb-2">House Photo</div>
              {sub.photos?.houseEntrance ? (
                <div className="aspect-[1/1] overflow-hidden p-2 rounded">
                  <img
                    src={sub.photos.houseEntrance}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[1/1] flex items-center justify-center text-gray-400">
                  No house photo
                </div>
              )}
            </div>

            {/* Selfie with House */}
            <div className="border bg-gray-100 rounded">
              <div className="text-sm text-gray-500 mb-2">
                Selfie with House
              </div>
              {sub.photos?.selfieWithHouse ? (
                <div className="aspect-[1/1] overflow-hidden p-2 rounded">
                  <img
                    src={sub.photos.selfieWithHouse}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[1/1] flex items-center justify-center text-gray-400">
                  No selfie
                </div>
              )}
            </div>

            {/* ID Photo */}
            <div className="border bg-gray-100 rounded">
              <div className="text-sm text-gray-500 mb-2">Address Proof</div>
              {sub.photos?.idPhoto ? (
                <div className="aspect-[1/1] overflow-hidden p-2 rounded">
                  <img
                    src={sub.photos.idPhoto}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[1/1] flex items-center justify-center text-gray-400">
                  No ID photo
                </div>
              )}
            </div>

            {/* Landmark Photo */}
            <div className="border bg-gray-100 rounded">
              <div className="text-sm text-gray-500 mb-2">
                Nearby Landmark Photo
              </div>
              {sub.photos?.landmarkPhoto ? (
                <div className="aspect-[1/1] overflow-hidden p-2 rounded">
                  <img
                    src={sub.photos.landmarkPhoto}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[1/1] flex items-center justify-center text-gray-400">
                  No landmark photo
                </div>
              )}
            </div>
          </div>

          {/* SIGNATURE - FULL WIDTH BELOW ALL PHOTOS */}
          <div className="mt-10">
            <div className="text-sm text-gray-500 mb-2">Signature</div>

            {sub.signatureUrl ? (
              <div className="w-full aspect-[4/1] bg-white border rounded p-4 flex items-center justify-center">
                <img
                  src={sub.signatureUrl}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/1] bg-gray-50 border flex items-center justify-center text-gray-400 rounded">
                No signature
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={accepted || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded shadow"
            >
              <FaCheck /> Accept
            </button>

            <button
              onClick={() => setConfirmReject(true)}
              disabled={rejectedInfo !== null || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded shadow"
            >
              <FaTimes /> Reject
            </button>

            <button
              onClick={handleDeleteSubmission}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded"
            >
              <FaTrash /> Delete
            </button>
          </div>

          {/* <div className="flex gap-3 items-center">
            <a
              href={`https://lions-digital-address.up.railway.app/api/pdf/submission/${sub._id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
            >
              Download PDF
            </a>
          </div> */}
        </div>

        {rejectedInfo && (
          <div className="bg-white border border-gray-300 shadow-xl rounded-xl p-6 mt-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              Submission Rejected
            </h3>

            <p className="font-medium text-gray-700">Reason:</p>
            <p className="text-gray-800 mb-4">{rejectedInfo.reason}</p>

            {/* Candidate Link */}
            {rejectedInfo.link && (
              <>
                <p className="font-medium text-gray-700">New Candidate Link:</p>

                <div className="flex items-center bg-gray-100 p-3 rounded-lg border mt-1">
                  <span className="text-blue-700 text-sm break-all flex-1">
                    {rejectedInfo.link}
                  </span>

                  <button
                    onClick={() => copy(rejectedInfo.link)}
                    className="p-2 bg-[#D4A017] text-white rounded-lg shadow hover:bg-[#b79214] transition"
                  >
                    <FaCopy />
                  </button>
                </div>

                {/* WhatsApp Share Button */}
                <a
                  href={`https://wa.me/${
                    rejectedInfo.mobile
                  }?text=${encodeURIComponent(
                    `Your verification was rejected.\n\n*Reason:* ${rejectedInfo.reason}\n\nPlease re-submit your details using this link:\n${rejectedInfo.link}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow w-max mt-4 transition"
                >
                  <FaWhatsapp className="text-xl" />
                  Resend on WhatsApp
                </a>
              </>
            )}
          </div>
        )}

        {/* Reject Modal */}
        <ConfirmModal
          open={confirmReject}
          title="Reject Submission"
          message={
            <div>
              <p className="mb-3 text-gray-700">Enter rejection reason:</p>
              <input
                className="w-full border p-2 rounded"
                placeholder="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          }
          onCancel={() => setConfirmReject(false)}
          onConfirm={handleRejectConfirmed}
        />

        <ConfirmModal
          open={confirmData.open}
          title={confirmData.title}
          message={confirmData.message}
          onCancel={closeConfirm}
          onConfirm={confirmData.onConfirm}
        />
      </div>
    </AdminLayout>
  );
}



