export default function SubmissionFilterBar({ filters, setFilters }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3">

      {/* DATE FROM */}
      <input
        type="date"
        className="border p-2 rounded"
        value={filters.from}
        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
      />

      {/* DATE TO */}
      <input
        type="date"
        className="border p-2 rounded"
        value={filters.to}
        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
      />

      {/* STATUS */}
      <select
        className="border p-2 rounded"
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>

      {/* CLIENT */}
      <input
        type="text"
        placeholder="Client Name"
        className="border p-2 rounded"
        value={filters.client}
        onChange={(e) => setFilters({ ...filters, client: e.target.value })}
      />

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search candidate / mobile"
        className="border p-2 rounded flex-1"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      {/* RESET */}
      <button
        className="bg-gray-200 px-4 py-2 rounded"
        onClick={() =>
          setFilters({
            from: "",
            to: "",
            status: "",
            client: "",
            search: "",
          })
        }
      >
        Reset
      </button>

    </div>
  );
}
