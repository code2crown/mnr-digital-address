import React, { useEffect, useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { getCurrentUser } from "../api/authHelper";
import { FaEye, FaRegTrashAlt } from "react-icons/fa";
import toast from "react-hot-toast";

export default function SubmissionsPage() {
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === "superadmin";

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "",
    refId: "",
    search: "",
  });

  useEffect(() => {
    loadFilteredData();
  }, [filters, page]);

  async function loadFilteredData() {
    try {
      const res = await API.get("/submissions/filter", {
        params: { ...filters, page, limit: 10 },
      });
      setSubmissions(res.data.submissions || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSubmission(id) {
    if (!window.confirm("Delete this submission permanently?")) return;
    try {
      await API.delete(`/submissions/delete/${id}`);
      toast.success("Submission deleted");
      loadFilteredData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-4">Submissions</h1>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3">
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
        <select
          className="border p-2 rounded"
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
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
          placeholder="Search candidate / mobile"
          value={filters.search}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
            setPage(1);
          }}
        />
        <button
          onClick={() => {
            setFilters({ from: "", to: "", status: "", refId: "", search: "" });
            setPage(1);
          }}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <table className="w-full border text-sm text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border">Ref ID</th>
              <th className="p-3 border">Candidate</th>
              <th className="p-3 border">Mobile</th>
              <th className="p-3 border">Client</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Date</th>
              <th className="p-3 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 border-b">
                  <td className="p-3 border font-mono text-xs font-semibold text-gray-700">
                    {s.invite?.referenceId || "—"}
                  </td>
                  <td className="p-3 border font-medium">{s.invite?.candidateName}</td>
                  <td className="p-3 border">{s.invite?.candidateMobile}</td>
                  <td className="p-3 border">{s.invite?.clientName}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        s.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : s.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 flex items-center justify-center gap-4 text-base">
                    <FaEye
                      className="text-blue-600 cursor-pointer hover:scale-110 transition"
                      onClick={() => (window.location.href = `/admin/submission/${s._id}`)}
                    />
                    {isSuperAdmin && (
                      <FaRegTrashAlt
                        className="text-red-600 cursor-pointer hover:scale-110 transition"
                        onClick={() => deleteSubmission(s._id)}
                      />
                    )}
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

