import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./guards";

// Route-level code splitting: each screen is its own chunk.
const LoginPage = lazy(() => import("../features/auth/login-page"));
const SignUpPage = lazy(() => import("../features/auth/signup-page"));
const ForgotPasswordPage = lazy(() => import("../features/auth/forgot-password-page"));
const ResetPasswordPage = lazy(() => import("../features/auth/reset-password-page"));
const AppLayout = lazy(() => import("./app-layout"));
const ChatsPage = lazy(() => import("../features/chats/chats-page"));
const ContactsPage = lazy(() => import("../features/contacts/contacts-page"));
const SettingsPage = lazy(() => import("../features/settings/settings-page"));
const NotFound = lazy(() => import("./not-found"));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable signed in or out: the link arrives by email. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* The list stays mounted while a thread is open; AppLayout renders the thread from the URL. */}
          <Route path="/chats" element={<ChatsPage />}>
            <Route path=":chatId" element={null} />
            <Route path=":chatId/info" element={null} />
          </Route>
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
