import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { fetchConversations } from "@/lib/api/messages";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { formatConversationListTimestamp } from "@/lib/messageTimestamps";
import { perfEnd, perfStart } from "@/lib/perfTiming";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import type { MobileConversationSummary } from "@/types/messages";

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<MobileConversationSummary[]>(
    () => getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations) ?? [],
  );
  const [loading, setLoading] = useState(() => conversations.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (options?: { background?: boolean; pull?: boolean }) => {
    const cached = getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations);
    const hasCache = Boolean(cached?.length);

    if (hasCache) {
      setConversations(cached!);
      setLoading(false);
    } else if (!options?.background && !options?.pull) {
      setLoading(true);
    }

    if (options?.pull) {
      setRefreshing(true);
    }

    setError(null);
    perfStart("messages");

    const { data, error: fetchError } = await fetchConversations();

    perfEnd("messages", { conversations: data.length, cached: hasCache });

    setConversations(data);
    setSessionCache(SESSION_CACHE_KEYS.conversations, data);
    setError(fetchError ? formatMobileError(fetchError.message) : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations);
      void loadConversations({ background: Boolean(cached?.length) });
    }, [loadConversations]),
  );

  function openConversation(conversation: MobileConversationSummary) {
    router.push({
      pathname: "/(app)/messages/[userId]",
      params: {
        userId: conversation.otherUserId,
        memberName: conversation.otherUserName,
      },
    });
  }

  const showInitialLoading = loading && conversations.length === 0;

  return (
    <Screen
      title="Messages"
      subtitle="Private conversations with members."
      branded
      refreshing={refreshing}
      onRefresh={() => void loadConversations({ pull: true })}
    >
      {showInitialLoading ? <LoadingState label="Loading conversations…" /> : null}

      {!showInitialLoading && error && conversations.length === 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadConversations()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!showInitialLoading && error && conversations.length > 0 ? (
        <View style={styles.softErrorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadConversations({ background: true })}>
            <Text style={styles.retry}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}

      {!showInitialLoading && !error && conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Start a conversation from Discover or a member profile."
        />
      ) : null}

      {!showInitialLoading
        ? conversations.map((conversation) => {
            const meta = formatMemberContextLine([
              formatPrimaryClubLine(conversation.otherUserPrimaryClub),
              conversation.otherUserBasedIn,
            ]);

            return (
              <Pressable
                key={conversation.otherUserId}
                onPress={() => openConversation(conversation)}
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              >
                <MemberIdentityLink
                  userId={conversation.otherUserId}
                  name={conversation.otherUserName}
                  avatarUrl={conversation.otherUserPhotoUrl}
                  size={48}
                  avatarOnly
                />
                <View style={styles.body}>
                  <View style={styles.topLine}>
                    <Text style={styles.name} numberOfLines={1}>
                      {conversation.otherUserName}
                    </Text>
                    <Text style={styles.time}>
                      {formatConversationListTimestamp(conversation.lastMessageAt)}
                    </Text>
                  </View>
                  {meta ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                  <Text style={styles.preview} numberOfLines={2}>
                    {conversation.lastMessageBody}
                  </Text>
                </View>
                {conversation.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadLabel}>{conversation.unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  pressed: {
    opacity: 0.92,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  time: {
    flexShrink: 0,
    fontFamily: typography.sans,
    fontSize: 11,
    color: colors.textTertiary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  preview: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.forest,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadLabel: {
    fontFamily: typography.sansSemibold,
    fontSize: 11,
    color: colors.ivory,
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  softErrorBox: {
    padding: spacing.md,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
  retry: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
});
