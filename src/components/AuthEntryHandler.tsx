import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { capturedAuthCallbackHasWork } from "../lib/authCallbackParams";
import { completeAuthEntryFromCallback } from "../lib/completeAuthEntry";
import { RouteLoading } from "./RouteLoading";

export function AuthEntryHandler({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [blocking, setBlocking] = useState(() => capturedAuthCallbackHasWork());

  useEffect(() => {
    if (!capturedAuthCallbackHasWork()) return;

    let active = true;

    void completeAuthEntryFromCallback()
      .then((result) => {
        if (!active) return;

        if (result.kind === "portal") {
          navigate("/member-portal", { replace: true });
        } else if (result.kind === "recovery") {
          navigate("/login", { replace: true, state: { recoveryVerified: true } });
        } else if (result.kind === "login_error") {
          navigate("/login", { replace: true, state: { authError: result.message } });
        }
      })
      .catch(() => {
        if (!active) return;
        navigate("/login", {
          replace: true,
          state: {
            authError:
              "This access link is invalid or has expired. Sign in with your password, or request a new email.",
          },
        });
      })
      .finally(() => {
        if (active) setBlocking(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (blocking) {
    return <RouteLoading label="Opening EliteTee" />;
  }

  return <>{children}</>;
}
