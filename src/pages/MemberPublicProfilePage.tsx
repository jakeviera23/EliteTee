import { useNavigate, useParams, useLocation } from "react-router-dom";
import { GolferProfilePage } from "../components/member-portal/GolferProfilePage";
import { IntroductionRequestModal } from "../components/member-portal/IntroductionRequestModal";
import { PortalToastProvider, usePortalToast } from "../components/member-portal/PortalToastProvider";
import { ComingSoonProvider } from "../components/member-portal/ComingSoonProvider";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import type { ProfileReturnContext } from "../types/memberProfileNavigation";
import { useState } from "react";
import "../inside-elitetee.css";
import "../member-portal.css";
import "../member-portal-theme.css";
import "../member-portal-profile.css";

type MemberProfileLocationState = {
  returnTo?: ProfileReturnContext;
  memberName?: string;
};

function MemberPublicProfileContent() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const location = useLocation();
  const { showToast } = usePortalToast();
  const [introRequestMember, setIntroRequestMember] = useState<MemberProfileRecord | null>(null);

  const state = (location.state as MemberProfileLocationState | null) ?? null;
  const returnTo = state?.returnTo ?? {
    type: "portal" as const,
    tab: "feed" as const,
    label: "Back to Feed",
  };

  function handleBack() {
    if (returnTo.type === "route") {
      navigate(returnTo.path);
      return;
    }

    navigate("/member-portal", {
      state: { restorePortalTab: returnTo.tab },
    });
  }

  function handleMessageMember(messageUserId: string, memberName: string) {
    navigate("/member-portal", {
      state: {
        openMessagesWith: { userId: messageUserId, memberName },
      },
    });
  }

  function handleRequestIntroduction(member: MemberProfileRecord) {
    setIntroRequestMember(member);
  }

  function handleOpenFeedPost(postId: string) {
    navigate("/member-portal", {
      state: {
        openFeedPostWith: { postId },
      },
    });
  }

  return (
    <div className="inside-page portal-page portal-page--social et-theme-portal" data-et-theme="portal">
      <main className="portal-main portal-main--social">
        <div className="portal-shell">
          <GolferProfilePage
            isActive
            viewUserId={userId}
            onBack={handleBack}
            backLabel={returnTo.label}
            onMessageMember={handleMessageMember}
            onRequestIntroduction={handleRequestIntroduction}
            onViewMemberProfile={(nextUserId, memberName) => {
              navigate(`/members/${nextUserId}`, {
                state: {
                  returnTo,
                  memberName,
                },
              });
            }}
            onOpenFeedPost={handleOpenFeedPost}
          />
        </div>
      </main>

      {introRequestMember ? (
        <IntroductionRequestModal
          member={introRequestMember}
          onClose={() => setIntroRequestMember(null)}
          onSubmitted={() => {
            showToast("Introduction request submitted");
            setIntroRequestMember(null);
            navigate("/member-portal", { state: { restorePortalTab: "introductions" } });
          }}
        />
      ) : null}
    </div>
  );
}

export function MemberPublicProfilePage() {
  return (
    <PortalToastProvider>
      <ComingSoonProvider>
        <MemberPublicProfileContent />
      </ComingSoonProvider>
    </PortalToastProvider>
  );
}
