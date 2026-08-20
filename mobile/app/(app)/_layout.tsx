import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, layout, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, TabIconName> = {
  index: "home-outline",
  discover: "compass-outline",
  create: "add-circle-outline",
  messages: "chatbubble-ellipses-outline",
  profile: "person-outline",
};

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: typography.sansMedium,
        fontSize: typography.caption,
        letterSpacing: 0.6,
        color: focused ? colors.chromeAccent ?? colors.gold : colors.chromeMuted,
      }}
    >
      {label}
    </Text>
  );
}

export default function AppTabsLayout() {
  const { loading, session, hasPortalAccess } = useAuth();

  if (loading) {
    return <LoadingState label="Opening member portal…" fullScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!hasPortalAccess) {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.chromeBg,
          borderTopColor: colors.chromeBorder,
          height: layout.tabBarHeight,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.chromeMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.index} size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.discover} size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Discover" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.create} size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Create" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.messages} size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Messages" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.profile} size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
