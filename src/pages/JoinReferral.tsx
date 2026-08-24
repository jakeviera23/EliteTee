import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { storeReferralCode } from "../lib/memberReferrals";

/**
 * Captures /join/{code} and forwards to the homepage membership application.
 * Invalid codes are ignored; the applicant can still apply normally.
 */
export function JoinReferral() {
  const { code = "" } = useParams();

  useEffect(() => {
    if (code.trim()) {
      storeReferralCode(code);
    }
  }, [code]);

  return <Navigate to="/#apply" replace />;
}
