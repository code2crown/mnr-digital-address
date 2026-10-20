import React, { useEffect, useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { FaEye } from "react-icons/fa";

export default function InvitesPage() {
  const [invites, setInvites] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    refId: "",
    search: "",
  });

  useEffect(() => {
    loadInvites();
  }, [page, limit, filters]);

  async function loadInvites() {
    try {
      const res = await API.get("/invites/all", {
        params: { ...filters, page, limit },
      });
      setInvites(res.data.invites || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  }

  function resetFilters() {
    setFilters({ from: "", to: "", refId: "", search: "" });
    setPage(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-4">All Invites</h1>

      {/* FILTER PANEL */}
      <div className="bg-white p-4 rounded shadow mb-5 flex flex-wrap gap-3">
        <input
          type="date"
          className="border p-2 rounded"
          value={filters.from}
          onChange={(e) => {
            setFilters({ ...filters, from: e.target.value });
            setPage(1);
          }}
        />
        <input
          type="date"
          className="border p-2 rounded"
          value={filters.to}
          onChange={(e) => {
            setFilters({ ...filters, to: e.target.value });
            setPage(1);
          }}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Search Reference ID"
          value={filters.refId}
          onChange={(e) => {
            setFilters({ ...filters, refId: e.target.value });
            setPage(1);
          }}
        />
        <input
          type="text"
          className="border p-2 rounded flex-1"
          placeholder="Search candidate name / mobile"
          value={filters.search}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
            setPage(1);
          }}
        />
        <button onClick={resetFilters} className="bg-gray-200 px-4 py-2 rounded">
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <table className="min-w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border">Ref ID</th>
              <th className="p-3 border">Candidate</th>
              <th className="p-3 border">Mobile</th>
              <th className="p-3 border">Client</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Created At</th>
              <th className="p-3 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan="7">
                  No invites found.
                </td>
              </tr>
            ) : (
              invites.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="p-3 border font-mono text-xs font-semibold text-gray-700">
                    {v.referenceId || "—"}
                  </td>
                  <td className="p-3 border font-medium">{v.candidateName}</td>
                  <td className="p-3 border">{v.candidateMobile}</td>
                  <td className="p-3 border">{v.clientName}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        v.tokenDisabled
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {v.tokenDisabled ? "Submitted" : "Pending"}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 border text-center">
                    <FaEye
                      className="inline text-blue-600 cursor-pointer text-base hover:scale-110 transition"
                      onClick={() => (window.location.href = `/admin/invite/${v._id}`)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-center mt-4 gap-2">
          <button
            className={`px-3 py-1.5 rounded ${
              page === 1 ? "bg-gray-200" : "bg-blue-600 text-white"
            }`}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            className={`px-3 py-1.5 rounded ${
              page === totalPages ? "bg-gray-200" : "bg-blue-600 text-white"
            }`}
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}