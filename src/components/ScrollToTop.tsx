import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function isSupabaseAuthHash(hash: string) {
  return /access_token=|refresh_token=|error_description=|error_code=|token_hash=/.test(hash);
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash && !isSupabaseAuthHash(hash)) {
      const id = hash.replace("#", "");
      const scrollToTarget = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: "start" });
        } else {
          window.scrollTo(0, 0);
        }
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTarget);
      });
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
