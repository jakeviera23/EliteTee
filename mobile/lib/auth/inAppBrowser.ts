import * as WebBrowser from "expo-web-browser";
import { colors } from "@/constants/theme";

const BROWSER_OPTIONS: WebBrowser.WebBrowserOpenOptions = {
  controlsColor: colors.forest,
  dismissButtonStyle: "done",
  enableBarCollapsing: true,
  showTitle: true,
};

/**
 * Open an EliteTee web page inside the app (SFSafariViewController on iOS,
 * Custom Tabs on Android) so members never leave for system Safari.
 * Resolves once the member closes the sheet.
 */
export async function openEliteTeeInAppBrowser(url: string) {
  const result = await WebBrowser.openBrowserAsync(url, BROWSER_OPTIONS);
  if (result.type !== "locked") return result;

  await dismissInAppBrowser();
  return WebBrowser.openBrowserAsync(url, BROWSER_OPTIONS);
}

/** Close the in-app browser if one is showing; safe to call when none is open. */
export async function dismissInAppBrowser() {
  try {
    await WebBrowser.dismissBrowser();
  } catch {
    // Not presented, or unsupported on this platform.
  }
}
