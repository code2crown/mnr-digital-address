export default function FilterBar({ filters, setFilters }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4 flex gap-4 flex-wrap">
      
      <input
        type="date"
        className="border p-2 rounded"
        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
      />

      <input
        type="date"
        className="border p-2 rounded"
        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
      />

      <select
        className="border p-2 rounded"
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">Status</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>

      <select
        className="border p-2 rounded"
        onChange={(e) => setFilters({ ...filters, district: e.target.value })}
      >
        <option value="">District</option>
        <option value="Kolkata">Kolkata</option>
        <option value="Asansol">Asansol</option>
      </select>

    </div>
  );
}
