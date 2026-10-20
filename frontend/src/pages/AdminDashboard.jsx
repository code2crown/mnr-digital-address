import React, { useEffect, useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { FaEye } from "react-icons/fa";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvites, setRecentInvites] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const s = await API.get("/dashboard/stats");
      const i = await API.get("/dashboard/recent-invites");
      const sub = await API.get("/dashboard/recent-submissions");

      setStats(s.data.stats);
      setRecentInvites(i.data.invites);
      setRecentSubs(sub.data.submissions);
    } catch (err) {
      console.error(err);
    }
  }

  if (!stats)
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );

  const statLabels = {
    totalInvites: "Total Invites",
    submittedTotal: "Total Submitted",
    pendingAll: "Total Pending",
    invitesToday: "Invites Today",
    invitesYesterday: "Invites Yesterday",
    submittedToday: "Submitted Today",
    invitesThisMonth: "Invites This Month",
    pendingThisMonth: "Pending This Month",
  };

  return (
    <AdminLayout>
      {/* 🔹 Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Object.entries(stats).map(([key, value]) => (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                       p-5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 
                       transition cursor-pointer"
            // onClick={() => (window.location.href = `/admin/stats-view/${key}`)}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {statLabels[key]}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* 🔹 Recent Tables Section */}
      <div className="mt-10 space-y-8">
        <DashboardTable title="Recent Invites" data={recentInvites} type="invite" />
        <DashboardTable title="Recent Submissions" data={recentSubs} type="submission" />
      </div>
    </AdminLayout>
  );
}

/* ---------------- TABLE COMPONENT ---------------- */

function DashboardTable({ title, data, type }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border 
                    border-gray-200 dark:border-gray-700 overflow-hidden">

      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>

        {type === "invite" && (
          <button
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            onClick={() => (window.location.href = "/admin/invites")}
          >
            View All
          </button>
        )}

        {type === "submission" && (
          <button
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            onClick={() => (window.location.href = "/admin/submissions")}
          >
            View All
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm">
              <th className="p-3">Candidate</th>
              <th className="p-3">Mobile</th>
              {type === "submission" && <th className="p-3">Status</th>}
              <th className="p-3">Date</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={type === "submission" ? 5 : 4}
                  className="p-4 text-center text-gray-500 dark:text-gray-400"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const name =
                  type === "invite"
                    ? item.candidateName
                    : item.invite?.candidateName;

                const mobile =
                  type === "invite"
                    ? item.candidateMobile
                    : item.invite?.candidateMobile;

                const date = new Date(item.createdAt).toLocaleString();

                return (
                  <tr
                    key={item._id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 
                               dark:hover:bg-gray-700 transition"
                  >
                    <td className="p-3">{name}</td>
                    <td className="p-3">{mobile}</td>

                    {type === "submission" && (
                      <td className="p-3">
                        <StatusBadge status={item.status} />
                      </td>
                    )}

                    <td className="p-3">{date}</td>

                    <td className="p-3 flex text-center justify-center">
                      <FaEye
                        className="text-blue-600 cursor-pointer hover:scale-110 transition"
                        onClick={() =>
                          window.location.href =
                            type === "invite"
                              ? `/admin/invite/${item._id}`
                              : `/admin/submission/${item._id}`
                        }
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- STATUS BADGE ---------------- */

function StatusBadge({ status }) {
  const classes =
    status === "accepted"
      ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
      : status === "rejected"
      ? "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200";

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${classes}`}>
      {status}
    </span>
  );
}
