import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthEntryHandler } from "./components/AuthEntryHandler";
import { PortalToastProvider } from "./components/member-portal/PortalToastProvider";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { InsideEliteTee } from "./pages/InsideEliteTee";
import { MemberDirectory } from "./pages/MemberDirectory";
import { MemberPortal } from "./pages/MemberPortal";
import { MemberPublicProfilePage } from "./pages/MemberPublicProfilePage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { AdminMembers } from "./pages/AdminMembers";
import { RequestIntroductionPage } from "./pages/RequestIntroductionPage";
import { InviteSignup } from "./pages/InviteSignup";
import { AuthCallback } from "./pages/AuthCallback";
import { NotFound } from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

import type { ProfileReturnContext } from "./types/memberProfileNavigation";

function CourseDetailRoute() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();

  return (
    <PortalToastProvider>
      <CourseDetailPage
        onMessageMember={(userId, memberName) => {
          navigate("/member-portal", {
            state: { openMessagesWith: { userId, memberName } },
          });
        }}
        onViewMemberProfile={(userId, memberName) => {
          const returnTo: ProfileReturnContext = {
            type: "route",
            path: `/courses/${slug}`,
            label: "Back to Course",
          };

          navigate(`/members/${userId}`, {
            state: {
              returnTo,
              memberName,
            },
          });
        }}
      />
    </PortalToastProvider>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AuthEntryHandler>
        <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/founder" element={<Navigate to="/about" replace />} />
      <Route path="/login" element={<InsideEliteTee />} />
      <Route path="/inside" element={<InsideEliteTee />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/invite/:token" element={<InviteSignup />} />
      <Route
        path="/members/:userId"
        element={
          <ProtectedRoute>
            <MemberPublicProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member-portal"
        element={
          <ProtectedRoute>
            <MemberPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <MemberPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:slug"
        element={
          <ProtectedRoute>
            <CourseDetailRoute />
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
      <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthEntryHandler>
    </>
  );
}
