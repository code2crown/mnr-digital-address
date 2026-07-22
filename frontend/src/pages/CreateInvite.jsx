import { useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import toast from "react-hot-toast";
import { FaWhatsapp, FaCopy } from "react-icons/fa";

export default function CreateInvite() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);

  const emptyForm = {
    clientName: "",
    organization: "MNR Solutions",
    candidateName: "",
    candidateEmail: "",
    candidateMobile: "",
    fullAddress: "",
    district: "",
    pincode: "",
    referenceId: "",
  };

  const [form, setForm] = useState(emptyForm);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm(emptyForm);
    setGenerated(null);
  }

  async function createInvite(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/invites/create", form);
      setGenerated(res.data);

      toast.success("Invite Created Successfully!", {
        style: { background: "#0B8A42", color: "white" },
        iconTheme: { primary: "white", secondary: "#0B8A42" },
      });
    } catch (err) {
      toast.error("Failed to create invite", {
        style: { background: "#D70000", color: "white" },
        iconTheme: { primary: "white", secondary: "#D70000" },
      });
    }

    setLoading(false);
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    toast.success("Link Copied!", {
      style: { background: "#D4A017", color: "white" },
    });
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        {/* HEADER + NEW INVITE BUTTON */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Create Capture Invite</h1>

          {/* Only show if an invite is created */}
          {generated && (
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-[#D4A017] text-white rounded-lg shadow hover:bg-[#b79214] transition text-sm"
            >
              + New Invite
            </button>
          )}
        </div>

        {/* FORM CARD */}
        <form
          onSubmit={createInvite}
          className="bg-white border border-gray-300 shadow-xl rounded p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <FormInput
                label="Client Name"
                name="clientName"
                placeholder="Client full name"
                value={form.clientName}
                update={update}
              />

              <FormInput
                label="Organization"
                name="organization"
                value={form.organization}
                update={update}
                disabled
              />

              <FormInput
                label="Candidate Name"
                name="candidateName"
                placeholder="Candidate full name"
                value={form.candidateName}
                update={update}
              />

              <FormInput
                label="Candidate Email"
                name="candidateEmail"
                placeholder="candidate@email.com"
                value={form.candidateEmail}
                update={update}
              />

              <FormInput
                label="Reference ID (optional)"
                name="referenceId"
                placeholder="Internal reference ID"
                value={form.referenceId}
                update={update}
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <FormInput
                label="Candidate Mobile"
                name="candidateMobile"
                placeholder="9876543210"
                value={form.candidateMobile}
                update={update}
              />

              <div>
                <label className="form-label">Full Address</label>
                <textarea
                  name="fullAddress"
                  rows="5"
                  placeholder="House No, Street, Area, City, State, PIN"
                  className="form-input"
                  value={form.fullAddress}
                  onChange={update}
                ></textarea>
              </div>

              <FormInput
                label="District"
                name="district"
                placeholder="District"
                value={form.district}
                update={update}
              />

              <FormInput
                label="Pincode"
                name="pincode"
                placeholder="110001"
                value={form.pincode}
                update={update}
              />
            </div>
          </div>

          {/* SUBMIT */}
          <div className="flex justify-end mt-10">
            <button
              disabled={loading}
              className="px-6 py-2 bg-[#0B8A42] text-white text-sm rounded-lg shadow hover:bg-[#096c33] transition"
            >
              {loading ? "Creating..." : "Create Invite"}
            </button>
          </div>
        </form>

        {/* SUCCESS BLOCK */}
        {generated && (
          <div className="bg-white border border-gray-300 shadow-xl rounded-xl p-6 mt-6">
            <h3 className="text-xl font-bold text-[#0B8A42] mb-4">
              Invite Created Successfully
            </h3>

            <p className="font-medium text-gray-700">Candidate Link:</p>

            <div className="flex items-center bg-gray-100 p-3 rounded-lg border mt-1">
              <span className="text-blue-700 text-sm break-all flex-1">
                {generated.link}
              </span>

              <button
                onClick={() => copy(generated.link)}
                className="p-2 bg-[#D4A017] text-white rounded-lg shadow hover:bg-[#b79214]"
              >
                <FaCopy />
              </button>
            </div>

            <a
              href={`https://wa.me/${
                form.candidateMobile
              }?text=${encodeURIComponent(
                `Hi *${form.candidateName}*\n\nI'm Digital Address Verification Executive from *MNR Solutions Private Limited*, on behalf of *${form.clientName}*.\n\nI have shared a link with you for digital address verification. Please click on the link and complete the verification process. If you face any issues, you can contact us.\n\n*Digital Address Verification Link:*\n${generated.link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow w-max mt-4 transition"
            >
              <FaWhatsapp className="text-xl" />
              Share on WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* SHARED INPUT STYLES */}
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
function FormInput({ label, name, value, placeholder, update, disabled }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={update}
        className={`form-input ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
      />
    </div>
  );
}
