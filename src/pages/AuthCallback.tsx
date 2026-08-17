import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { capturedAuthCallbackHasWork } from "../lib/authCallbackParams";
import { RouteLoading } from "../components/RouteLoading";

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!capturedAuthCallbackHasWork()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return <RouteLoading label="Opening EliteTee" />;
}
