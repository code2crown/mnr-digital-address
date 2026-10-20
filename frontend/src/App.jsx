import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import CreateInvite from "./pages/CreateInvite";
import InvitesPage from "./pages/InvitesPage";
import CandidateForm from "./pages/CandidateForm";
import ViewSubmission from "./pages/ViewSubmission";
import ViewInvite from "./pages/ViewInvite";
import SubmissionsPage from "./pages/SubmissionsPage";
import ManageClients from "./pages/ManageClients";
import BillingPage from "./pages/BillingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ThankYou from "./pages/ThankYou";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/admin-login" replace />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute>
              <ManageClients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/create-invite"
          element={
            <ProtectedRoute>
              <CreateInvite />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/invites"
          element={
            <ProtectedRoute>
              <InvitesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/invite/:id"
          element={
            <ProtectedRoute>
              <ViewInvite />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/submissions"
          element={
            <ProtectedRoute>
              <SubmissionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/submission/:id"
          element={
            <ProtectedRoute>
              <ViewSubmission />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />

        {/* CANDIDATE PUBLIC ROUTES */}
        <Route path="/verify/:token" element={<CandidateForm />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="*" element={<div className="p-10 text-center">Invalid Link</div>} />
      </Routes>
    </BrowserRouter>
  );
}