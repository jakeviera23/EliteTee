import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { capturedAuthCallbackHasWork } from "../lib/authCallbackParams";
import { resolveAuthCallbackLoginNavigation } from "../lib/passwordRecoveryIntent";
import { RouteLoading } from "../components/RouteLoading";

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (capturedAuthCallbackHasWork()) {
      // AuthEntryHandler owns callback completion while capture still has work.
      return;
    }

    const target = resolveAuthCallbackLoginNavigation();
    navigate(target.path, {
      replace: true,
      ...(target.state ? { state: target.state } : {}),
    });
  }, [navigate]);

  return <RouteLoading label="Opening EliteTee" />;
}
