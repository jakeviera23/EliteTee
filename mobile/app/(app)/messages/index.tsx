import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { fetchConversations } from "@/lib/api/messages";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
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
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (options?: { background?: boolean }) => {
    const cached = getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations);
    const hasCache = Boolean(cached?.length);

    if (hasCache) {
      setConversations(cached!);
      setLoading(false);
    } else if (!options?.background) {
      setLoading(true);
    }

    setError(null);
    perfStart("messages");

    const { data, error: fetchError } = await fetchConversations();

    perfEnd("messages", { conversations: data.length, cached: hasCache });

    setConversations(data);
    if (data.length > 0) {
      setSessionCache(SESSION_CACHE_KEYS.conversations, data);
    }
    setError(fetchError ? formatMobileError(fetchError.message) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const cached = getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations);
    void loadConversations({ background: Boolean(cached?.length) });
  }, [loadConversations]);

  function openConversation(conversation: MobileConversationSummary) {
    router.push({
      pathname: "/(app)/messages/[userId]",
      params: {
        userId: conversation.otherUserId,
        memberName: conversation.otherUserName,
      },
    });
  }

  return (
    <Screen title="Messages" subtitle="Private conversations with members." branded>
      {loading && conversations.length === 0 ? <LoadingState label="Loading conversations…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Start a conversation from Discover or a member profile."
        />
      ) : null}

      {!loading && !error
        ? conversations.map((conversation) => {
            const meta = formatMemberContextLine([
              formatPrimaryClubLine(conversation.otherUserPrimaryClub),
              conversation.otherUserBasedIn,
            ]);

            return (
              <View key={conversation.otherUserId} style={styles.row}>
                <MemberIdentityLink
                  userId={conversation.otherUserId}
                  name={conversation.otherUserName}
                  avatarUrl={conversation.otherUserPhotoUrl}
                  size={48}
                  avatarOnly
                />
                <View style={styles.body}>
                  <Pressable
                    onPress={() => router.push(`/members/${conversation.otherUserId}`)}
                    style={({ pressed }) => [pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.name}>{conversation.otherUserName}</Text>
                    {meta ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => openConversation(conversation)}
                    style={({ pressed }) => [pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.preview} numberOfLines={2}>
                      {conversation.lastMessageBody}
                    </Text>
                  </Pressable>
                </View>
                {conversation.unreadCount > 0 ? (
                  <Pressable
                    onPress={() => openConversation(conversation)}
                    style={styles.unreadBadge}
                  >
                    <Text style={styles.unreadLabel}>{conversation.unreadCount}</Text>
                  </Pressable>
                ) : null}
              </View>
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
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
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
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
});
