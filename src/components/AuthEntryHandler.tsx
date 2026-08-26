import { type ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { capturedAuthCallbackHasWork } from "../lib/authCallbackParams";
import {
  completeAuthEntryFromCallback,
  consumeAuthEntryCallback,
} from "../lib/completeAuthEntry";
import { RouteLoading } from "./RouteLoading";

export function AuthEntryHandler({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [blocking, setBlocking] = useState(() => capturedAuthCallbackHasWork());
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    if (!capturedAuthCallbackHasWork()) {
      setBlocking(false);
      return;
    }

    handledRef.current = true;
    let active = true;

    void completeAuthEntryFromCallback()
      .then((result) => {
        // Consume before navigating so pathname changes cannot re-process recovery.
        consumeAuthEntryCallback();
        if (!active) return;

        if (result.kind === "portal") {
          navigateRef.current("/member-portal", { replace: true });
        } else if (result.kind === "recovery") {
          navigateRef.current("/login", { replace: true, state: { recoveryVerified: true } });
        } else if (result.kind === "login_error") {
          navigateRef.current("/login", { replace: true, state: { authError: result.message } });
        }
      })
      .catch(() => {
        consumeAuthEntryCallback();
        if (!active) return;
        navigateRef.current("/login", {
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
  }, []);

  if (blocking) {
    return <RouteLoading label="Opening EliteTee" />;
  }

  return <>{children}</>;
}
