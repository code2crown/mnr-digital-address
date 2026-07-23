import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import toast from "react-hot-toast";
import { FaWhatsapp, FaCopy, FaTrash, FaSave, FaEdit } from "react-icons/fa";

export default function ViewInvitePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [id]);

  async function loadInvite() {
  try {
    const res = await API.get(`/invites/${id}`);

    setInvite({
      ...res.data.invite,
      link: res.data.link
    });

  } catch (err) {
    toast.error("Failed to load invite");
  }
}


  function update(e) {
    setInvite({ ...invite, [e.target.name]: e.target.value });
  }

  async function saveUpdate() {
    setSaving(true);
    try {
      await API.put(`/invites/update/${id}`, invite);

      toast.success("Invite updated successfully!", {
        style: { background: "#0B8A42", color: "white" }
      });

      setEditMode(false);
    } catch (err) {
      toast.error("Failed to update invite");
    }
    setSaving(false);
  }

  async function deleteInvite() {
    if (!confirm("Are you sure you want to delete this invite?")) return;

    try {
      await API.delete(`/invites/delete/${id}`);

      toast.success("Invite deleted!", {
        style: { background: "#D70000", color: "white" }
      });

      navigate("/admin/invites");
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    toast.success("Link Copied!", {
      style: { background: "#D4A017", color: "white" }
    });
  }

  if (!invite) return <AdminLayout>Loading...</AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-6xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">View Invite</h1>

          {!editMode ? (
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
              onClick={() => setEditMode(true)}
            >
              <FaEdit /> Edit
            </button>
          ) : (
            <button
              className="flex items-center gap-2 bg-[#0B8A42] text-white px-4 py-2 rounded shadow hover:bg-[#096c33]"
              onClick={saveUpdate}
              disabled={saving}
            >
              <FaSave />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>

        {/* FORM CARD */}
        <div className="bg-white border border-gray-300 shadow-xl rounded p-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            {/* LEFT */}
            <div className="space-y-6">
              <FormInput label="Client Name" name="clientName" value={invite.clientName} update={update} disabled={!editMode} />

              <FormInput label="Organization" name="organization" value={invite.organization} update={update} disabled />

              <FormInput label="Candidate Name" name="candidateName" value={invite.candidateName} update={update} disabled={!editMode} />

              <FormInput label="Candidate Email" name="candidateEmail" value={invite.candidateEmail} update={update} disabled={!editMode} />

              <FormInput label="Reference ID" name="referenceId" value={invite.referenceId} update={update} disabled={!editMode} />
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <FormInput label="Candidate Mobile" name="candidateMobile" value={invite.candidateMobile} update={update} disabled={!editMode} />

              {/* Address */}
              <div>
                <label className="form-label">Full Address</label>
                <textarea
                  name="fullAddress"
                  rows="5"
                  className="form-input"
                  value={invite.fullAddress}
                  disabled={!editMode}
                  onChange={update}
                ></textarea>
              </div>

              <FormInput label="District" name="district" value={invite.district} update={update} disabled={!editMode} />

              <FormInput label="Pincode" name="pincode" value={invite.pincode} update={update} disabled={!editMode} />
            </div>
          </div>

          {/* DELETE BUTTON */}
          <div className="flex justify-end mt-10">
            <button
              onClick={deleteInvite}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm rounded-lg shadow hover:bg-red-700"
            >
              <FaTrash />
              Delete Invite
            </button>
          </div>
        </div>

        {/* SUCCESS SECTION */}
        <div className="bg-white border border-gray-300 shadow-xl rounded-xl p-6 mt-6">
          <h3 className="text-xl font-bold text-[#0B8A42] mb-4">Candidate Link</h3>

          <div className="flex items-center bg-gray-100 p-3 rounded-lg border">
            <span className="text-blue-700 text-sm break-all flex-1">
              {invite.link}
            </span>
            <button
              onClick={() => copy(invite.link)}
              className="p-2 bg-[#D4A017] text-white rounded-lg shadow hover:bg-[#b79214]"
            >
              <FaCopy />
            </button>
          </div>

          {/* WhatsApp */}
          <a
              href={`https://wa.me/${
                invite.candidateMobile
              }?text=${encodeURIComponent(
                `Hi *${invite.candidateName}*\n\nI'm Digital Address Verification Executive from *MNR Solutions Private Limited*, on behalf of *${invite.clientName}*.\n\nI have shared a link with you for digital address verification. Please click on the link and complete the verification process. If you face any issues, you can contact us.\n\n*Digital Address Verification Link:*\n${invite.link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow w-max mt-4 transition"
            >
              <FaWhatsapp className="text-xl" />
              Share on WhatsApp
            </a>
        </div>

      </div>

      {/* SHARED STYLES */}
      <style>{`
        .form-label {
          @apply block text-gray-700 font-medium mb-1;
        }
        .form-input {
          @apply w-full border border-gray-300 rounded-lg p-3 bg-gray-50
          focus:bg-white focus:ring-2 focus:ring-[#D4A017] focus:outline-none;
        }
      `}</style>
    </AdminLayout>
  );
}

/* INPUT COMPONENT */
function FormInput({ label, name, value, update, disabled }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        type="text"
        name={name}
        disabled={disabled}
        value={value}
        onChange={update}
        className={`form-input ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
      />
    </div>
  );
}
