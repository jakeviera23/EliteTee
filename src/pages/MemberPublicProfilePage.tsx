import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { GolferProfilePage } from "../components/member-portal/GolferProfilePage";
import { PortalToastProvider } from "../components/member-portal/PortalToastProvider";
import { ComingSoonProvider } from "../components/member-portal/ComingSoonProvider";
import {
  fetchMemberRelationshipContext,
  type MemberRelationshipContext,
} from "../lib/memberRelationships";
import type { ProfileReturnContext } from "../types/memberProfileNavigation";
import "../inside-elitetee.css";
import "../member-portal.css";
import "../member-portal-theme.css";
import "../member-portal-profile.css";
import "../member-portal-buttons.css";

type MemberProfileLocationState = {
  returnTo?: ProfileReturnContext;
  memberName?: string;
};

function MemberPublicProfileContent() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const location = useLocation();
  const [relationshipContext, setRelationshipContext] = useState<MemberRelationshipContext | null>(
    null,
  );

  useEffect(() => {
    void fetchMemberRelationshipContext().then(({ context }) => setRelationshipContext(context));
  }, [userId]);

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
            relationshipContext={relationshipContext}
            onMessageMember={handleMessageMember}
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
