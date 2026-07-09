import { Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { InsideEliteTee } from "./pages/InsideEliteTee";
import { MemberDirectory } from "./pages/MemberDirectory";
import { MemberPortal } from "./pages/MemberPortal";
import { AdminMembers } from "./pages/AdminMembers";
import { RequestIntroductionPage } from "./pages/RequestIntroductionPage";
import { InviteSignup } from "./pages/InviteSignup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/founder" element={<Navigate to="/about" replace />} />
      <Route path="/login" element={<InsideEliteTee />} />
      <Route path="/inside" element={<InsideEliteTee />} />
      <Route path="/invite/:token" element={<InviteSignup />} />
      <Route
        path="/member-portal"
        element={
          <ProtectedRoute>
            <MemberPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-members"
        element={
          <AdminRoute>
            <AdminMembers />
          </AdminRoute>
        }
      />
      <Route path="/directory" element={<MemberDirectory />} />
      <Route path="/request-introduction" element={<RequestIntroductionPage />} />
      </Routes>
    </>
  );
}
