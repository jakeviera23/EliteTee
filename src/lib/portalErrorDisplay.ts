export function memberFacingPortalError(message: string, context?: "feed" | "message" | "profile" | "introduction" | "experience" | "general"): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("signed in") || normalized.includes("auth") || normalized.includes("jwt")) {
    return "Please sign in again to continue.";
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("violates row-level security")
  ) {
    return "You do not have permission to complete this action.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "EliteTee could not reach the server. Check your connection and try again.";
  }

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "That record already exists. Refresh and try again.";
  }

  if (normalized.includes("pgrst202") || normalized.includes("could not find the function")) {
    return "Your changes could not be saved because the server is missing a required database update. Contact support if this continues.";
  }

  switch (context) {
    case "feed":
      return "Your changes could not be saved.";
    case "message":
      return "Your message could not be sent. Please try again.";
    case "profile":
      return "Your profile could not be saved. Please try again.";
    case "introduction":
      return "Your introduction request could not be sent. Please try again.";
    case "experience":
      return "Your experience could not be saved. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function memberFacingCoverPhotoError(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("signed in") || normalized.includes("auth") || normalized.includes("jwt")) {
    return "Please sign in again to update the cover photo.";
  }

  if (normalized.includes("cover photo must belong") || normalized.includes("cover photo not found")) {
    return "That photo could not be set as the cover. Choose another photo from this experience.";
  }

  if (normalized.includes("permission") || normalized.includes("only update cover photos on your own")) {
    return "You do not have permission to change the cover photo on this experience.";
  }

  if (normalized.includes("portal access is required")) {
    return "Portal access is required to change the cover photo.";
  }

  return "Your cover photo could not be updated, but your other changes were saved.";
}
