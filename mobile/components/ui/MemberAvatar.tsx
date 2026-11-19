import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type ImageStyle, type ViewStyle } from "react-native";
import { colors, typography } from "@/constants/theme";
import { resolveMemberMediaUrl } from "@/lib/api/memberProfileMedia";
import { getMemberInitials } from "@/lib/memberInitials";

type MemberAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  style?: ViewStyle;
};

export function MemberAvatar({ name, imageUrl, size = 44, style }: MemberAvatarProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    const stored = imageUrl?.trim() ?? "";
    if (!stored) {
      setResolvedUrl(null);
      return () => {
        active = false;
      };
    }

    if (/^https?:\/\//i.test(stored)) {
      setResolvedUrl(stored);
      return () => {
        active = false;
      };
    }

    void resolveMemberMediaUrl(stored).then((url) => {
      if (active) setResolvedUrl(url);
    });

    return () => {
      active = false;
    };
  }, [imageUrl]);

  const radius = size / 2;

  if (resolvedUrl && !failed) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
          style as ImageStyle,
        ]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.38) }]}>
        {getMemberInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.bgInset,
  },
  fallback: {
    backgroundColor: colors.forestSoft,
    borderWidth: 1,
    borderColor: colors.forestBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: typography.serifSemibold,
    color: colors.forest,
  },
});
