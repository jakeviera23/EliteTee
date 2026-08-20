import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import {
  Newsreader_400Regular,
  Newsreader_600SemiBold,
  useFonts as useNewsreaderFonts,
} from "@expo-google-fonts/newsreader";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/hooks/AuthProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [newsreaderLoaded] = useNewsreaderFonts({
    Newsreader_400Regular,
    Newsreader_600SemiBold,
  });

  const fontsLoaded = interLoaded && newsreaderLoaded;

  if (!fontsLoaded) {
    return <LoadingState label="Loading EliteTee…" fullScreen />;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgBase },
        }}
      />
    </AuthProvider>
  );
}
