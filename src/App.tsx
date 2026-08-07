import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PortalToastProvider } from "./components/member-portal/PortalToastProvider";
import { Home } from "./pages/Home";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

import type { ProfileReturnContext } from "./types/memberProfileNavigation";

const About = lazy(() => import("./pages/About").then((module) => ({ default: module.About })));
const InsideEliteTee = lazy(() =>
  import("./pages/InsideEliteTee").then((module) => ({ default: module.InsideEliteTee })),
);
const MemberDirectory = lazy(() =>
  import("./pages/MemberDirectory").then((module) => ({ default: module.MemberDirectory })),
);
const MemberPortal = lazy(() =>
  import("./pages/MemberPortal").then((module) => ({ default: module.MemberPortal })),
);
const MemberPublicProfilePage = lazy(() =>
  import("./pages/MemberPublicProfilePage").then((module) => ({
    default: module.MemberPublicProfilePage,
  })),
);
const CourseDetailPage = lazy(() =>
  import("./pages/CourseDetailPage").then((module) => ({ default: module.CourseDetailPage })),
);
const AdminMembers = lazy(() =>
  import("./pages/AdminMembers").then((module) => ({ default: module.AdminMembers })),
);
const InviteSignup = lazy(() =>
  import("./pages/InviteSignup").then((module) => ({ default: module.InviteSignup })),
);
const NotFound = lazy(() =>
  import("./pages/NotFound").then((module) => ({ default: module.NotFound })),
);

function RouteFallback() {
  return <div className="page-loading" role="status" aria-live="polite">Loading…</div>;
}

function CourseDetailRoute() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();

  return (
    <PortalToastProvider>
      <CourseDetailPage
        onMessageMember={(userId, memberName) => {
          navigate("/member-portal/messages", {
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/founder" element={<Navigate to="/about" replace />} />
      <Route path="/login" element={<InsideEliteTee />} />
      <Route path="/inside" element={<InsideEliteTee />} />
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
        path="/member-portal/:section"
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
      <Route path="/request-introduction" element={<Navigate to="/#apply" replace />} />
      <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
