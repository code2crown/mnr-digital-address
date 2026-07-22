import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useState } from "react";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    navigate("/admin-login");
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2] text-gray-900">

      {/* SIDEBAR */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-64"
        } bg-white shadow-xl border-r border-gray-200 transition-all duration-300 fixed h-full flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <img src={logo} className="h-12 w-12 rounded-full shadow-md" />

          {/* Hide text when collapsed */}
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-gray-900">MNR Solutions PVT LTD</h1>
              <p className="text-xs text-gray-500">Your Trusted BGV Partner</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 text-sm font-medium text-gray-700">
          <NavItem to="/admin/dashboard" icon="📊" label="Dashboard" collapsed={collapsed} />
          <NavItem to="/admin/create-invite" icon="➕" label="Create Invite" collapsed={collapsed} />
          <NavItem to="/admin/invites" icon="📁" label="All Invites" collapsed={collapsed} />
          <NavItem to="/admin/submissions" icon="📄" label="Submissions" collapsed={collapsed} />
        </nav>

        {/* Bottom buttons */}
        <div className="p-4 border-t border-gray-200 flex flex-col gap-3">

          {/* Collapse Button */}
          <button
            className={`py-2 w-full rounded-lg hover:bg-gray-200 transition flex items-center justify-center ${
              collapsed ? "text-xl" : ""
            }`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "➡️" : "⬅️ Collapse"}
          </button>

          {/* Logout (⏻ icon) */}
          <button
            className={`
              py-2 w-full rounded-lg 
              bg-gradient-to-r from-red-600 to-red-500 
              text-white shadow hover:shadow-lg transition flex items-center justify-center
            `}
            onClick={logout}
          >
            {/* Power Icon (only icon when collapsed) */}
            {collapsed ? (
              <span className="text-xl">⏻</span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">⏻</span> Logout
              </span>
            )}
          </button>

        </div>

      </aside>

      {/* MAIN AREA */}
      <div className={`${collapsed ? "ml-20" : "ml-64"} flex-1 transition-all duration-300`}>

        {/* Top Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">Admin Panel</h2>

          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <span>Admin</span>
            <img src={logo} className="h-8 w-8 rounded-full shadow" />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

/* Sidebar Navigation Component */
function NavItem({ to, icon, label, collapsed }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 hover:text-green-700 transition"
    >
      <span className="text-lg">{icon}</span>

      {/* Hide label when collapsed */}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
