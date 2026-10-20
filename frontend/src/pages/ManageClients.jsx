import React, { useEffect, useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import API from "../api/api";
import toast from "react-hot-toast";
import { FaEdit } from "react-icons/fa";

export default function ManageClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const initialForm = {
    name: "",
    companyName: "",
    companyShortName: "",
    companyLogo: "",
    supportPhone: "",
    companyAddress: "",
    gstNumber: "",
    email: "",
    password: "",
    ratePerVerification: 50,
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await API.get("/clients/all");
      setClients(res.data.clients || []);
    } catch {
      toast.error("Failed to load clients");
    }
  }

  function openCreateModal() {
    setEditingClient(null);
    setForm(initialForm);
    setShowModal(true);
  }

  function openEditModal(client) {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      companyName: client.companyName || "",
      companyShortName: client.companyShortName || "",
      companyLogo: client.companyLogo || "",
      supportPhone: client.supportPhone || "",
      companyAddress: client.companyAddress || "",
      gstNumber: client.gstNumber || "",
      email: client.email || "",
      password: "", // Leave empty unless changing password
      ratePerVerification: client.ratePerVerification || 50,
    });
    setShowModal(true);
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, companyLogo: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveClient(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingClient) {
        await API.put(`/clients/update/${editingClient._id}`, form);
        toast.success("Client Updated Successfully!");
      } else {
        await API.post("/clients/create", form);
        toast.success("Client Created Successfully!");
      }
      setShowModal(false);
      loadClients();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(client) {
    try {
      await API.put(`/clients/update/${client._id}`, {
        isActive: !client.isActive,
      });
      toast.success("Client status updated");
      loadClients();
    } catch {
      toast.error("Update failed");
    }
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Clients</h1>
          <p className="text-sm text-gray-500">
            Create or update white-label client accounts and verification rates
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow font-medium"
        >
          + Add New Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-700 border-b">
            <tr>
              <th className="p-3">Logo</th>
              <th className="p-3">Company Name</th>
              <th className="p-3">Contact Person</th>
              <th className="p-3">Login Email</th>
              <th className="p-3">Rate / Case</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {c.companyLogo ? (
                      <img
                        src={c.companyLogo}
                        alt={c.companyName}
                        className="h-10 w-10 object-contain border rounded p-0.5"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                        {c.companyShortName || "LOGO"}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-gray-900">
                    {c.companyName}
                    <div className="text-xs text-gray-400">
                      Watermark: {c.companyShortName} VERIFIED
                    </div>
                  </td>
                  <td className="p-3">
                    {c.name}
                    <div className="text-xs text-gray-500">{c.supportPhone}</div>
                  </td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3 font-bold text-green-700">
                    ₹{c.ratePerVerification}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        c.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="p-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`px-3 py-1 rounded text-xs font-medium text-white ${
                        c.isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {c.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingClient ? `Edit Client — ${editingClient.companyName}` : "Add New White-Label Client"}
            </h2>
            <form onSubmit={handleSaveClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Company Full Name *</label>
                <input
                  required
                  placeholder="e.g. MNR Solutions Private Limited"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Short Name (PDF Watermark) *</label>
                <input
                  required
                  placeholder="e.g. MNR"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.companyShortName}
                  onChange={(e) => setForm({ ...form, companyShortName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Contact Person Name *</label>
                <input
                  required
                  placeholder="Client Admin Name"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Support Phone</label>
                <input
                  placeholder="+919876543210"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Client Login Email *</label>
                <input
                  type="email"
                  required
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">
                  {editingClient ? "New Password (leave blank to keep current)" : "Client Login Password *"}
                </label>
                <input
                  type="text"
                  required={!editingClient}
                  placeholder={editingClient ? "Enter only to change password" : "Set Password"}
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Rate per Accepted Verification (₹) *</label>
                <input
                  type="number"
                  required
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.ratePerVerification}
                  onChange={(e) => setForm({ ...form, ratePerVerification: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Client GST Number</label>
                <input
                  placeholder="GSTIN"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600">Company Address</label>
                <input
                  placeholder="Client Office Address for Billing"
                  className="w-full border p-2.5 rounded mt-1"
                  value={form.companyAddress}
                  onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600">Upload Client Logo (PNG/JPG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full border p-2 rounded mt-1"
                />
                {form.companyLogo && (
                  <img
                    src={form.companyLogo}
                    alt="Preview"
                    className="h-12 mt-2 object-contain border p-1 rounded"
                  />
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold"
                >
                  {loading ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}