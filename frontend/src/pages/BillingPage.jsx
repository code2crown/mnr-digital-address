import React, { useEffect, useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import API from "../api/api";
import { getCurrentUser } from "../api/authHelper";
import toast from "react-hot-toast";

export default function BillingPage() {
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === "superadmin";

  // 👇 YAHAN APNI ASLI UPI ID DAALEIN 👇
  const UPI_ID = import.meta.env.VITE_COMPANY_UPI_ID || "karunanidhi8723@naviaxis";
  const PAYEE_NAME = "Karunanidhi";

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(
    isSuperAdmin ? "" : user?.id
  );
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/clients/all").then((res) => {
        const list = res.data.clients || [];
        setClients(list);
        if (list.length > 0) setSelectedClientId(list[0]._id);
      });
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedClientId) {
      fetchBill();
    }
  }, [selectedClientId, month, year]);

  async function fetchBill() {
    setLoading(true);
    try {
      const res = await API.get(`/billing/client-bill/${selectedClientId}`, {
        params: { month, year },
      });
      setBillData(res.data);
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  async function togglePaymentStatus() {
    if (!billData) return;
    const nextStatus = billData.paymentStatus === "paid" ? "unpaid" : "paid";
    setUpdatingStatus(true);
    try {
      await API.post("/billing/status", {
        clientId: selectedClientId,
        month,
        year,
        status: nextStatus,
      });
      toast.success(`Invoice marked as ${nextStatus.toUpperCase()}`);
      fetchBill();
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  const isPaid = billData?.paymentStatus === "paid";

  // Dynamic UPI String with exact Invoice Amount
  const upiUri = billData
    ? `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${
        billData.totalAmount
      }&cu=INR&tn=${encodeURIComponent(`Bill ${billData.billingMonth}`)}`
    : "";

  const qrCodeUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        upiUri
      )}`
    : "";

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow border print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Billing & Invoice</h1>
          <p className="text-sm text-gray-500">
            Based on Accepted (Successful) Verifications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <select
              className="border p-2.5 rounded-lg bg-gray-50 font-medium"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          )}

          <select
            className="border p-2.5 rounded-lg bg-gray-50"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            className="border p-2.5 rounded-lg bg-gray-50"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {isSuperAdmin && billData && (
            <button
              onClick={togglePaymentStatus}
              disabled={updatingStatus}
              className={`px-4 py-2.5 rounded-lg shadow font-semibold text-white ${
                isPaid
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {updatingStatus
                ? "Updating..."
                : isPaid
                ? "Mark as UNPAID"
                : "Mark as PAID"}
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg shadow font-semibold"
          >
            Download / Print Bill PDF
          </button>
        </div>
      </div>

      {loading || !billData ? (
        <div className="p-8 text-center bg-white rounded-xl shadow">
          Loading Bill Details...
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-lg border max-w-4xl mx-auto print:shadow-none print:border-none">
          {/* INVOICE HEADER */}
          <div className="flex justify-between items-start border-b-2 border-green-700 pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-green-700">
                CODE 2 CROWN
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Digital Address Verification SaaS Platform
              </p>
              <p className="text-xs text-gray-500">Noida, Uttar Pradesh, India</p>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-800">MONTHLY INVOICE</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                    isPaid
                      ? "bg-green-100 text-green-800 border-green-400"
                      : "bg-red-100 text-red-700 border-red-300"
                  }`}
                >
                  {isPaid ? "PAID" : "UNPAID"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Billing Period:</strong> {billData.billingMonth}
              </p>
              {isPaid && billData.paidAt && (
                <p className="text-xs text-green-700 font-medium">
                  Paid on: {new Date(billData.paidAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* BILLED TO & SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Billed To (Client)
              </p>
              <h4 className="text-lg font-bold text-gray-900 mt-1">
                {billData.client.name}
              </h4>
              <p className="text-sm text-gray-600">{billData.client.email}</p>
              {billData.client.address && (
                <p className="text-xs text-gray-600 mt-1">{billData.client.address}</p>
              )}
              {billData.client.gst && (
                <p className="text-xs text-gray-600 mt-1">
                  <strong>GSTIN:</strong> {billData.client.gst}
                </p>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex flex-col justify-center">
              <div className="flex justify-between text-sm mb-1">
                <span>Total Successful Verifications:</span>
                <strong>{billData.totalVerifiedCases} Cases</strong>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Approved Rate Per Verification:</span>
                <strong>₹{billData.ratePerVerification} / Case</strong>
              </div>
              <div className="border-t border-green-300 pt-2 flex justify-between text-lg font-bold text-green-800">
                <span>Total Payable Amount:</span>
                <span>₹{billData.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold">
                <span>Payment Status:</span>
                <span className={isPaid ? "text-green-700" : "text-red-600"}>
                  {isPaid ? "✔ PAYMENT RECEIVED" : "⏳ PAYMENT PENDING"}
                </span>
              </div>
            </div>
          </div>

          {/* ITEMIZED VERIFIED CASES TABLE */}
          <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">
            Itemized Successful Verifications ({billData.totalVerifiedCases})
          </h4>
          <table className="w-full text-left border-collapse text-sm mb-6">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2.5 border">#</th>
                <th className="p-2.5 border">Ref ID</th>
                <th className="p-2.5 border">Candidate Name</th>
                <th className="p-2.5 border">Mobile</th>
                <th className="p-2.5 border">Verified On</th>
                <th className="p-2.5 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.submissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500 border">
                    No accepted verifications in this month.
                  </td>
                </tr>
              ) : (
                billData.submissions.map((sub, idx) => (
                  <tr key={sub._id} className="border-b">
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{sub.invite?.referenceId || "—"}</td>
                    <td className="p-2 border font-medium">
                      {sub.invite?.candidateName || "—"}
                    </td>
                    <td className="p-2 border">{sub.invite?.candidateMobile || "—"}</td>
                    <td className="p-2 border">
                      {sub.acceptedAt
                        ? new Date(sub.acceptedAt).toLocaleDateString()
                        : new Date(sub.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-2 border text-right font-medium">
                      ₹{billData.ratePerVerification}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* UPI PAYMENT & QR CODE SECTION */}
          <div className="mt-6 border-t-2 border-dashed border-gray-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gray-50 p-5 rounded-xl border">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase px-2.5 py-1 bg-green-100 text-green-800 rounded">
                Instant UPI Payment
              </span>
              <h4 className="text-base font-bold text-gray-900 pt-1">
                Scan QR or Pay via UPI ID
              </h4>
              <p className="text-sm text-gray-700">
                <strong>UPI ID:</strong>{" "}
                <span className="font-mono bg-white px-2 py-0.5 border rounded text-green-700 font-bold">
                  {UPI_ID}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                <strong>Merchant Name:</strong> {PAYEE_NAME}
              </p>
              <p className="text-xs text-gray-500">
                Supports GPay, PhonePe, Paytm & BHIM Apps
              </p>
            </div>

            <div className="flex flex-col items-center bg-white p-3 rounded-xl border shadow-sm">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="h-32 w-32 object-contain"
                />
              )}
              <span className="text-[11px] font-semibold text-gray-600 mt-1">
                Scan to Pay ₹{billData.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-8 border-t pt-4">
            This is a system-generated invoice by Code 2 Crown Portal.
          </div>
        </div>
      )}
    </AdminLayout>
  );
}