import { Link, useNavigate, useLocation } from "react-router-dom";
import defaultLogo from "../assets/logo.png";
import { useState } from "react";
import { getCurrentUser, setAuthToken } from "../api/authHelper";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();

  const isSuperAdmin = user?.role === "superadmin";
  const displayLogo = user?.companyLogo || defaultLogo;
  const displayCompany = user?.companyName || (isSuperAdmin ? "Code 2 Crown" : "Client Portal");

  function logout() {
    setAuthToken(null);
    navigate("/admin-login");
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2] text-gray-900 print:bg-white">
      {/* SIDEBAR (Hidden when printing invoice) */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-64"
        } bg-white shadow-xl border-r border-gray-200 transition-all duration-300 fixed h-full flex flex-col z-40 print:hidden`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <img
            src={displayLogo}
            alt="Logo"
            className="h-11 w-11 rounded-full object-contain border p-0.5 shadow-sm"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {displayCompany}
              </h1>
              <p className="text-xs text-green-700 font-medium">
                {isSuperAdmin ? "Super Admin Panel" : "Client Portal"}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 text-sm font-medium text-gray-700">
          <NavItem
            to="/admin/dashboard"
            icon="📊"
            label="Dashboard"
            collapsed={collapsed}
            active={location.pathname === "/admin/dashboard"}
          />

          {isSuperAdmin && (
            <NavItem
              to="/admin/clients"
              icon="🏢"
              label="Manage Clients"
              collapsed={collapsed}
              active={location.pathname === "/admin/clients"}
            />
          )}

          <NavItem
            to="/admin/create-invite"
            icon="➕"
            label="Create Invite"
            collapsed={collapsed}
            active={location.pathname === "/admin/create-invite"}
          />

          <NavItem
            to="/admin/invites"
            icon="📁"
            label="All Invites"
            collapsed={collapsed}
            active={location.pathname.startsWith("/admin/invite")}
          />

          <NavItem
            to="/admin/submissions"
            icon="📄"
            label="Submissions"
            collapsed={collapsed}
            active={location.pathname.startsWith("/admin/submission")}
          />

          <NavItem
            to="/admin/billing"
            icon="💳"
            label="Monthly Billing"
            collapsed={collapsed}
            active={location.pathname === "/admin/billing"}
          />
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
          <button
            className="py-2 w-full rounded-lg hover:bg-gray-100 transition flex items-center justify-center text-sm"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "➡️" : "⬅️ Collapse"}
          </button>

          <button
            className="py-2 w-full rounded-lg bg-red-600 hover:bg-red-700 text-white shadow transition flex items-center justify-center gap-2 text-sm font-semibold"
            onClick={logout}
          >
            <span>⏻</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div
        className={`${
          collapsed ? "ml-20" : "ml-64"
        } flex-1 transition-all duration-300 print:ml-0`}
      >
        {/* Top Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center print:hidden">
          <h2 className="text-lg font-semibold text-gray-800">
            {isSuperAdmin ? "Code 2 Crown — Super Admin" : `${displayCompany} — Dashboard`}
          </h2>

          <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
            <div className="text-right">
              <div className="font-semibold text-gray-900">{user?.name || "Admin"}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <img
              src={displayLogo}
              alt="Profile"
              className="h-9 w-9 rounded-full object-contain border shadow-sm"
            />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, collapsed, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-lg transition ${
        active
          ? "bg-green-600 text-white shadow-sm"
          : "hover:bg-green-50 hover:text-green-700 text-gray-700"
      }`}
    >
      <span className="text-lg">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}