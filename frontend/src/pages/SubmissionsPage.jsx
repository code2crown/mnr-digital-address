import React, { useEffect, useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { FaEye, FaRegTrashAlt } from "react-icons/fa";
import toast from "react-hot-toast";

import ConfirmModal from "../components/ConfirmModal";
import useConfirmModal from "../hooks/useConfirmModal";

export default function SubmissionsPage() {
  const { confirm, ConfirmModalUI } = useConfirmModal();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [jumpPage, setJumpPage] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const [selected, setSelected] = useState([]); // For bulk delete
  const [selectAll, setSelectAll] = useState(false);
  const [confirmData, setConfirmData] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "",
    client: "",
    search: "",
  });

  useEffect(() => {
    loadFilteredData();
  }, [filters, page, limit]);

  async function loadFilteredData() {
    try {
      const res = await API.get("/submissions/filter", {
        params: { ...filters, page, limit },
      });

      setSubmissions(res.data.submissions);
      setTotalPages(res.data.totalPages);
      setSelected([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
    }
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleReset() {
    setFilters({ from: "", to: "", status: "", client: "", search: "" });
    setPage(1);
  }

  // STATUS BADGE
  const StatusBadge = ({ status }) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      accepted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}
      >
        {status}
      </span>
    );
  };

  function showConfirm(title, message, onConfirm) {
    setConfirmData({
      open: true,
      title,
      message,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmData((prev) => ({ ...prev, open: false }));
  }

  // DELETE SINGLE SUBMISSION
  function deleteSubmission(id) { 
    showConfirm(
      "Delete Submission",
      "Are you sure you want to delete this submission permanently?",
      async () => {
        try {
          await API.delete(`/submissions/delete/${id}`);
          toast.success("Submission deleted");
          closeConfirm();
          loadFilteredData();
        } catch (err) {
          toast.error("Failed to delete");
          closeConfirm();
        }
      }
    );
  }

  // BULK DELETE
  function bulkDelete() {
    if (selected.length === 0) {
      toast.error("No submissions selected");
      return;
    }

    showConfirm(
      "Bulk Delete",
      `Are you sure you want to delete ${selected.length} submissions?`,
      async () => {
        try {
          await API.post("/submissions/bulk-delete", { ids: selected });
          toast.success("Selected submissions deleted");
          alert("Contact your IT");
          closeConfirm();
          loadFilteredData();
        } catch (err) {
          toast.error("Bulk delete failed");
          closeConfirm();
        }
      }
    );
  }

  // SELECT HANDLERS
  function toggleSelectAll() {
    if (selectAll) {
      setSelected([]);
    } else {
      setSelected(submissions.map((s) => s._id));
    }
    setSelectAll(!selectAll);
  }

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Submissions</h1>

        {/* BULK DELETE BUTTON */}
        {/* <button
          onClick={bulkDelete}
          className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
        >
          Delete Selected ({selected.length})
        </button> */}
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3">
        <input
          type="date"
          className="border p-2 rounded"
          value={filters.from}
          onChange={(e) => updateFilter("from", e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={filters.to}
          onChange={(e) => updateFilter("to", e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Client Name"
          value={filters.client}
          onChange={(e) => updateFilter("client", e.target.value)}
        />

        <input
          type="text"
          className="border p-2 rounded flex-1"
          placeholder="Search candidate / mobile"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />

        <button
          onClick={handleReset}
          className="bg-gray-200 px-4 py-2 rounded shadow"
        >
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2 border">Candidate</th>
              <th className="p-2 border">Client</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-4 text-gray-500">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(s._id)}
                      onChange={() => toggleSelect(s._id)}
                    />
                  </td>

                  <td className="p-2 border">{s.invite?.candidateName}</td>
                  <td className="p-2 border">{s.invite?.clientName}</td>
                  <td className="p-2 border">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="p-2 border">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>

                  <td className="p-2 flex items-center justify-center gap-4 text-lg">
                    {/* VIEW ICON */}
                    <FaEye
                      className="text-blue-600 cursor-pointer hover:scale-110 transition"
                      onClick={() =>
                        (window.location.href = `/admin/submission/${s._id}`)
                      }
                    />
                  
                    {/* DELETE ICON */}
                    {/* <FaRegTrashAlt
                      className="cursor-pointer hover:scale-110 transition"
                      onClick={() => deleteSubmission(s._id)}
                    /> */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-center mt-4 gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className={`px-3 py-2 rounded ${
              page === 1 ? "bg-gray-200" : "bg-blue-600 text-white"
            }`}
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-2 rounded ${
                page === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className={`px-3 py-2 rounded ${
              page === totalPages ? "bg-gray-200" : "bg-blue-600 text-white"
            }`}
          >
            Next
          </button>
        </div>
      </div>
      <ConfirmModal
        open={confirmData.open}
        title={confirmData.title}
        message={confirmData.message}
        onCancel={closeConfirm}
        onConfirm={confirmData.onConfirm}
      />
    </AdminLayout>
  );
}
