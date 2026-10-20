import { useState } from "react";
import API from "../api/api";
import { setAuthToken } from "../api/authHelper";
import logo from "../assets/logo.png";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      setAuthToken(res.data.accessToken, res.data.user);
      toast.success("Welcome back!");
      window.location.href = "/admin/dashboard";
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f2] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex justify-center mb-3">
          <img src={logo} alt="Logo" className="h-16 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900">
          Portal Login
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Digital Address Verification Portal
        </p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              required
              className="w-full p-3 border rounded-lg border-gray-300 focus:ring-2 focus:ring-green-600 outline-none"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="mb-4 relative">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              className="w-full p-3 pr-12 border rounded-lg border-gray-300 focus:ring-2 focus:ring-green-600 outline-none"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="absolute top-9 right-3 text-gray-500 text-sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 shadow-md transition"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Powered by{" "}
          <a
            href="https://code2crown.com"
            className="font-semibold text-green-700 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Code 2 Crown
          </a>
        </div>
      </div>
    </div>
  );
}