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

  switch (context) {
    case "feed":
      return "Your post could not be published. Please try again.";
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
