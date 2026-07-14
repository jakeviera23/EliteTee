import { useEffect, useState } from "react";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import {
  ensureBucketListHydrated,
  isCourseOnBucketList,
  toggleBucketListCourse,
} from "../../lib/portalCourseState";
import { usePortalToast } from "./PortalToastProvider";

type BucketListToggleButtonProps = {
  courseId: string;
  className?: string;
  variant?: "portal-outline" | "et-secondary";
  onToggled?: (isOnBucketList: boolean) => void;
};

function buildButtonClassName(variant: BucketListToggleButtonProps["variant"], isOnBucketList: boolean) {
  if (variant === "et-secondary") {
    return `et-btn et-btn--secondary${isOnBucketList ? " is-active" : ""}`;
  }

  return `portal-btn portal-btn--outline${isOnBucketList ? " is-active" : ""}`;
}

export function BucketListToggleButton({
  courseId,
  className,
  variant = "portal-outline",
  onToggled,
}: BucketListToggleButtonProps) {
  const { showToast } = usePortalToast();
  const [isOnBucketList, setIsOnBucketList] = useState(() => isCourseOnBucketList(courseId));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void ensureBucketListHydrated().then(() => {
      if (active) {
        setIsOnBucketList(isCourseOnBucketList(courseId));
      }
    });

    function handleCourseStateChanged() {
      setIsOnBucketList(isCourseOnBucketList(courseId));
    }

    window.addEventListener("elitetee:course-state-changed", handleCourseStateChanged);

    return () => {
      active = false;
      window.removeEventListener("elitetee:course-state-changed", handleCourseStateChanged);
    };
  }, [courseId]);

  async function handleClick() {
    if (isLoading) return;

    setIsLoading(true);

    const { isOnBucketList: next, error } = await toggleBucketListCourse(courseId);

    setIsLoading(false);
    setIsOnBucketList(next);
    onToggled?.(next);

    if (error) {
      showToast(memberFacingPortalError(error.message, "profile"));
      return;
    }

    showToast(
      next ? "Added to your bucket list" : "Removed from your bucket list",
    );
  }

  const label = isLoading
    ? "Saving…"
    : isOnBucketList
      ? "Remove from Bucket List"
      : "Add to Bucket List";

  return (
    <button
      type="button"
      className={[buildButtonClassName(variant, isOnBucketList), className].filter(Boolean).join(" ")}
      onClick={() => void handleClick()}
      aria-pressed={isOnBucketList}
      aria-busy={isLoading}
      disabled={isLoading}
    >
      {label}
    </button>
  );
}
