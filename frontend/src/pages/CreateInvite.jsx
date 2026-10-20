import { useState, useEffect } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { getCurrentUser } from "../api/authHelper";
import toast from "react-hot-toast";
import { FaWhatsapp, FaCopy } from "react-icons/fa";

export default function CreateInvite() {
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === "superadmin";

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [clients, setClients] = useState([]);

  const emptyForm = {
    clientId: isSuperAdmin ? "" : user?.id,
    clientName: user?.companyName || "",
    candidateName: "",
    candidateEmail: "",
    candidateMobile: "",
    fullAddress: "",
    district: "",
    pincode: "",
    referenceId: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/clients/all").then((res) => {
        const list = res.data.clients || [];
        setClients(list);
        if (list.length > 0) {
          setForm((f) => ({
            ...f,
            clientId: list[0]._id,
            clientName: list[0].companyName,
          }));
        }
      });
    }
  }, [isSuperAdmin]);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function createInvite(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/invites/create", form);
      setGenerated(res.data);
      toast.success("Invite Created Successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create invite");
    } finally {
      setLoading(false);
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    toast.success("Link Copied!");
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Create Verification Invite</h1>
          {generated && (
            <button
              onClick={() => {
                setForm(emptyForm);
                setGenerated(null);
              }}
              className="px-4 py-2 bg-[#D4A017] text-white rounded-lg shadow text-sm"
            >
              + New Invite
            </button>
          )}
        </div>

        <form
          onSubmit={createInvite}
          className="bg-white border border-gray-300 shadow-xl rounded-xl p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {isSuperAdmin ? (
                <div>
                  <label className="form-label">Select Client</label>
                  <select
                    className="form-input"
                    value={form.clientId}
                    onChange={(e) => {
                      const sel = clients.find((c) => c._id === e.target.value);
                      setForm({
                        ...form,
                        clientId: e.target.value,
                        clientName: sel?.companyName || "",
                      });
                    }}
                  >
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="form-label">Organization / Client</label>
                  <input
                    className="form-input bg-gray-100 text-gray-600"
                    value={form.clientName}
                    disabled
                  />
                </div>
              )}

              <div>
                <label className="form-label">Candidate Name *</label>
                <input
                  name="candidateName"
                  required
                  placeholder="Candidate full name"
                  className="form-input"
                  value={form.candidateName}
                  onChange={update}
                />
              </div>

              <div>
                <label className="form-label">Candidate Email *</label>
                <input
                  type="email"
                  name="candidateEmail"
                  required
                  placeholder="candidate@email.com"
                  className="form-input"
                  value={form.candidateEmail}
                  onChange={update}
                />
              </div>

              <div>
                <label className="form-label">Reference ID *</label>
                <input
                  name="referenceId"
                  required
                  placeholder="Case / Reference ID"
                  className="form-input"
                  value={form.referenceId}
                  onChange={update}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Candidate Mobile *</label>
                <input
                  name="candidateMobile"
                  required
                  placeholder="9876543210"
                  className="form-input"
                  value={form.candidateMobile}
                  onChange={update}
                />
              </div>

              <div>
                <label className="form-label">Full Address *</label>
                <textarea
                  name="fullAddress"
                  required
                  rows="3"
                  placeholder="House No, Street, Area, City, State"
                  className="form-input"
                  value={form.fullAddress}
                  onChange={update}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">District *</label>
                  <input
                    name="district"
                    required
                    placeholder="District"
                    className="form-input"
                    value={form.district}
                    onChange={update}
                  />
                </div>

                <div>
                  <label className="form-label">Pincode *</label>
                  <input
                    name="pincode"
                    required
                    placeholder="110001"
                    className="form-input"
                    value={form.pincode}
                    onChange={update}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              disabled={loading}
              className="px-6 py-2.5 bg-[#0B8A42] text-white rounded-lg shadow font-semibold hover:bg-green-700"
            >
              {loading ? "Creating..." : "Create Invite"}
            </button>
          </div>
        </form>

        {generated && (
          <div className="bg-white border border-gray-300 shadow-xl rounded-xl p-6 mt-6">
            <h3 className="text-xl font-bold text-[#0B8A42] mb-3">
              Invite Created Successfully
            </h3>
            <div className="flex items-center bg-gray-100 p-3 rounded-lg border">
              <span className="text-blue-700 text-sm break-all flex-1">
                {generated.link}
              </span>
              <button
                onClick={() => copy(generated.link)}
                className="p-2 bg-[#D4A017] text-white rounded-lg shadow"
              >
                <FaCopy />
              </button>
            </div>

            <a
              href={`https://wa.me/${
                form.candidateMobile
              }?text=${encodeURIComponent(
                `Hi *${form.candidateName}*,\n\nYour digital address verification has been initiated by *${form.clientName}*.\n\nPlease click the link below to complete your verification process:\n${generated.link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow w-max mt-4"
            >
              <FaWhatsapp className="text-xl" />
              Share on WhatsApp
            </a>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}