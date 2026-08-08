import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import {
  fetchConversationThread,
  markDirectMessagesAsRead,
  PRIVATE_MESSAGE_MAX_LENGTH,
  sendDirectPrivateMessage,
} from "@/lib/api/messages";
import { fetchMemberByUserId } from "@/lib/api/members";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobilePrivateMessage } from "@/types/messages";

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId, memberName } = useLocalSearchParams<{ userId: string; memberName?: string }>();
  const [messages, setMessages] = useState<MobilePrivateMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [title, setTitle] = useState(memberName?.trim() || "");
  const [subtitle, setSubtitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<MobilePrivateMessage>>(null);

  const loadThread = useCallback(async () => {
    if (!userId) return;

    const [{ data, error: fetchError }, markResult] = await Promise.all([
      fetchConversationThread(userId),
      markDirectMessagesAsRead(userId),
    ]);

    if (markResult.error) {
      console.warn("[messages] mark read failed", markResult.error.message);
    }

    setMessages(data);
    setError(fetchError ? formatMobileError(fetchError.message) : null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      const [memberResult] = await Promise.all([
        fetchMemberByUserId(userId),
        loadThread(),
      ]);

      if (!active) return;

      const { data: member } = memberResult;
      if (member) {
        const displayName = getMemberDisplayName(member.full_name);
        if (displayName) {
          setTitle(displayName);
        }
        setAvatarUrl(member.club_logo_url);
        const meta = formatMemberContextLine([
          formatPrimaryClubLine(member.primary_club),
          member.based_in,
        ]);
        setSubtitle(meta || "Private message");
      } else if (memberName?.trim()) {
        setTitle(memberName.trim());
        setSubtitle("Private message");
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, memberName, loadThread]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [messages.length]);

  async function handleSend() {
    if (!userId) return;

    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > PRIVATE_MESSAGE_MAX_LENGTH) {
      setSendError(`Message cannot exceed ${PRIVATE_MESSAGE_MAX_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setSendError(null);

    const optimisticMessage: MobilePrivateMessage = {
      id: `optimistic-${Date.now()}`,
      introduction_request_id: null,
      sender_id: user?.id ?? "",
      receiver_id: userId,
      body: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");

    const { data, error: sendFailure } = await sendDirectPrivateMessage({
      receiverUserId: userId,
      body: trimmed,
    });

    if (sendFailure || !data) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setDraft(trimmed);
      setSendError(formatMobileError(sendFailure?.message ?? "Message could not be sent."));
      setSending(false);
      return;
    }

    const { data: refreshed, error: refreshError } = await fetchConversationThread(userId);
    if (!refreshError) {
      setMessages(refreshed);
    } else {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, id: data.id, created_at: new Date().toISOString() }
            : message,
        ),
      );
    }

    setSending(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.forest} />
          </Pressable>
          {userId ? (
            <MemberIdentityLink
              userId={userId}
              name={title || "Member"}
              avatarUrl={avatarUrl}
              subtitle={subtitle || undefined}
              size={40}
              style={styles.headerIdentity}
            />
          ) : (
            <View style={styles.headerText}>
              {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>

      {loading ? <LoadingState label="Loading messages…" fullScreen /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Try again" variant="ghost" onPress={() => void loadThread()} />
        </View>
      ) : null}

      {!loading && !error ? (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Start the conversation"
              body="Send the first message to this member."
            />
          }
          renderItem={({ item }) => {
            const isOwn = item.sender_id === user?.id;
            return (
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.body, isOwn ? styles.bodyOwn : null]}>{item.body}</Text>
                <Text style={[styles.meta, isOwn ? styles.metaOwn : null]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            );
          }}
        />
      ) : null}

      {!loading && !error ? (
        <View style={styles.composer}>
          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={styles.composerInput}
              maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
            />
            <Button
              label={sending ? "…" : "Send"}
              onPress={() => void handleSend()}
              loading={sending}
              disabled={!draft.trim()}
            />
          </View>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  headerText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerIdentity: {
    flex: 1,
  },
  title: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: "85%",
    padding: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  bubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: colors.forest,
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyOwn: {
    color: colors.ivory,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 11,
    color: colors.textTertiary,
  },
  metaOwn: {
    color: colors.ivory,
    opacity: 0.75,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendError: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.error,
  },
  errorBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
});
