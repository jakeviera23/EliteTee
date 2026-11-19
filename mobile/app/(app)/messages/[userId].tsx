import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import {
  fetchConversations,
  fetchConversationThread,
  formatMobileMessagePreviewBody,
  markDirectMessagesAsRead,
  PRIVATE_MESSAGE_MAX_LENGTH,
  sendDirectPrivateMessage,
  type MobilePrivateMessageImageDraft,
} from "@/lib/api/messages";
import { draftFromPrivateMessageImagePickerAsset } from "@/lib/privateMessageImageRules";
import { fetchMemberByUserId } from "@/lib/api/members";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { formatMessageBubbleTimestamp } from "@/lib/messageTimestamps";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { SESSION_CACHE_KEYS, setSessionCache } from "@/lib/sessionCache";
import {
  markConversationReadInCache,
  upsertConversationPreviewInCache,
} from "@/lib/conversationCache";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobilePrivateMessage } from "@/types/messages";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    userId: string;
    memberName?: string;
    prefill?: string;
  }>();
  const userId = firstParam(params.userId);
  const memberName = firstParam(params.memberName);
  const prefill = firstParam(params.prefill);

  const [messages, setMessages] = useState<MobilePrivateMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(prefill);
  const [pendingImage, setPendingImage] = useState<MobilePrivateMessageImageDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedDraft, setFailedDraft] = useState<string | null>(null);
  const [failedPendingImage, setFailedPendingImage] =
    useState<MobilePrivateMessageImageDraft | null>(null);
  const [title, setTitle] = useState(memberName || "");
  const [subtitle, setSubtitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberClub, setMemberClub] = useState("");
  const [memberBasedIn, setMemberBasedIn] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<MobilePrivateMessage>>(null);
  const prefillApplied = useRef(false);

  useEffect(() => {
    if (prefillApplied.current) return;
    if (prefill) {
      setDraft(prefill);
      prefillApplied.current = true;
    }
  }, [prefill]);

  const loadThread = useCallback(async () => {
    if (!userId) return;

    const { data, error: fetchError } = await fetchConversationThread(userId);
    setMessages(data);
    setError(fetchError ? formatMobileError(fetchError.message) : null);
    setLoading(false);

    if (!fetchError) {
      const markResult = await markDirectMessagesAsRead(userId);
      if (markResult.error) {
        console.warn("[messages] mark read failed", markResult.error.message);
      } else {
        markConversationReadInCache(userId);
        setMessages((current) =>
          current.map((message) =>
            message.receiver_id === user?.id && !message.read_at
              ? { ...message, read_at: new Date().toISOString() }
              : message,
          ),
        );
      }
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      const [memberResult] = await Promise.all([fetchMemberByUserId(userId), loadThread()]);

      if (!active) return;

      const { data: member } = memberResult;
      if (member) {
        const displayName = getMemberDisplayName(member.full_name);
        if (displayName) {
          setTitle(displayName);
        }
        setAvatarUrl(member.club_logo_url);
        setMemberClub(member.primary_club ?? "");
        setMemberBasedIn(member.based_in ?? "");
        const meta = formatMemberContextLine([
          formatPrimaryClubLine(member.primary_club),
          member.based_in,
        ]);
        setSubtitle(meta || "Private message");
      } else if (memberName) {
        setTitle(memberName);
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

  function syncInboxPreview(body: string, createdAt: string, attachmentCount = 0) {
    if (!userId) return;
    upsertConversationPreviewInCache({
      otherUserId: userId,
      otherUserName: title || memberName || "Member",
      otherUserPhotoUrl: avatarUrl,
      otherUserPrimaryClub: memberClub,
      otherUserBasedIn: memberBasedIn,
      lastMessageBody: formatMobileMessagePreviewBody(body, attachmentCount),
      lastMessageAt: createdAt,
    });
  }

  async function handlePickImage() {
    if (sending) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSendError("Photo library access is required to attach an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // Images only — video attachments are not supported by the DM media pipeline.
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
        exif: false,
        // Prefer a broadly displayable/uploadable representation (JPEG) on iOS HEIC libraries.
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (result.canceled || !result.assets[0]) return;

      const picked = draftFromPrivateMessageImagePickerAsset(result.assets[0]);
      if ("error" in picked) {
        setSendError(picked.error);
        return;
      }

      setSendError(null);
      setFailedDraft(null);
      setFailedPendingImage(null);
      setPendingImage(picked.draft);
    } catch (error) {
      setSendError(
        formatMobileError(
          error instanceof Error ? error.message : "Could not open the photo library.",
        ),
      );
    }
  }

  async function handleSend(options?: {
    bodyOverride?: string;
    imageOverride?: MobilePrivateMessageImageDraft | null;
  }) {
    if (!userId || sending) return;

    const trimmed = (options?.bodyOverride ?? draft).trim();
    const imageDraft =
      options && "imageOverride" in options ? options.imageOverride ?? null : pendingImage;

    if (!trimmed && !imageDraft) return;

    if (trimmed.length > PRIVATE_MESSAGE_MAX_LENGTH) {
      setSendError(`Message cannot exceed ${PRIVATE_MESSAGE_MAX_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setSendError(null);
    setFailedDraft(null);
    setFailedPendingImage(null);

    const sentAt = new Date().toISOString();
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MobilePrivateMessage = {
      id: optimisticId,
      introduction_request_id: null,
      sender_id: user?.id ?? "",
      receiver_id: userId,
      body: trimmed,
      created_at: sentAt,
      read_at: null,
      attachments: imageDraft
        ? [
            {
              id: `${optimisticId}-att`,
              message_id: optimisticId,
              storage_path: "",
              content_type: imageDraft.mimeType ?? "image/jpeg",
              byte_size: 0,
              width: imageDraft.width ?? null,
              height: imageDraft.height ?? null,
              sort_order: 0,
              created_at: sentAt,
              signedUrl: imageDraft.uri,
            },
          ]
        : [],
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setPendingImage(null);
    syncInboxPreview(trimmed, sentAt, imageDraft ? 1 : 0);

    const { data, error: sendFailure } = await sendDirectPrivateMessage({
      receiverUserId: userId,
      body: trimmed,
      imageDrafts: imageDraft ? [imageDraft] : [],
    });

    if (sendFailure || !data) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setDraft(trimmed);
      setPendingImage(imageDraft);
      setFailedDraft(trimmed || null);
      setFailedPendingImage(imageDraft);
      setSendError(formatMobileError(sendFailure?.message ?? "Message could not be sent."));
      void fetchConversations().then(({ data: conversations }) => {
        if (conversations) {
          setSessionCache(SESSION_CACHE_KEYS.conversations, conversations);
        }
      });
      setSending(false);
      return;
    }

    const { data: refreshed, error: refreshError } = await fetchConversationThread(userId);
    if (!refreshError) {
      setMessages(refreshed);
      const latest = refreshed[refreshed.length - 1];
      if (latest) {
        syncInboxPreview(latest.body, latest.created_at, latest.attachments?.length ?? 0);
      }
    } else {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, id: data.id, created_at: sentAt }
            : message,
        ),
      );
      syncInboxPreview(trimmed, sentAt, imageDraft ? 1 : 0);
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
              {title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {loading && messages.length === 0 ? (
          <LoadingState label="Loading messages…" fullScreen />
        ) : null}

        {!loading && error && messages.length === 0 ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Try again" variant="ghost" onPress={() => void loadThread()} />
          </View>
        ) : null}

        {!loading || messages.length > 0 ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && !error ? (
                <EmptyState
                  title={title ? `Message ${title}` : "Start the conversation"}
                  body="Send the first message to this member. Prefills stay editable until you send."
                />
              ) : null
            }
            renderItem={({ item }) => {
              const isOwn = item.sender_id === user?.id;
              const attachments = item.attachments ?? [];
              const hasBody = Boolean(item.body.trim());
              return (
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  {attachments.length > 0 ? (
                    <View style={styles.attachments}>
                      {attachments.map((attachment) =>
                        attachment.signedUrl ? (
                          <Pressable
                            key={attachment.id}
                            onPress={() => setLightboxUrl(attachment.signedUrl ?? null)}
                          >
                            <Image
                              source={{ uri: attachment.signedUrl }}
                              style={styles.attachmentImage}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ) : (
                          <Text
                            key={attachment.id}
                            style={[styles.body, isOwn ? styles.bodyOwn : null]}
                          >
                            Photo
                          </Text>
                        ),
                      )}
                    </View>
                  ) : null}
                  {hasBody ? (
                    <Text style={[styles.body, isOwn ? styles.bodyOwn : null]}>{item.body}</Text>
                  ) : null}
                  <Text style={[styles.meta, isOwn ? styles.metaOwn : null]}>
                    {formatMessageBubbleTimestamp(item.created_at)}
                  </Text>
                </View>
              );
            }}
          />
        ) : null}

        <Modal
          visible={Boolean(lightboxUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setLightboxUrl(null)}
        >
          <Pressable style={styles.lightbox} onPress={() => setLightboxUrl(null)}>
            {lightboxUrl ? (
              <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Modal>

        {!error || messages.length > 0 ? (
          <View style={styles.composer}>
            {sendError ? (
              <View style={styles.sendErrorRow}>
                <Text style={styles.sendError}>{sendError}</Text>
                {failedDraft || failedPendingImage ? (
                  <Pressable
                    onPress={() =>
                      void handleSend({
                        bodyOverride: failedDraft ?? "",
                        imageOverride: failedPendingImage,
                      })
                    }
                  >
                    <Text style={styles.retry}>Retry</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {pendingImage ? (
              <View style={styles.pendingRow}>
                <Image source={{ uri: pendingImage.uri }} style={styles.pendingThumb} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected image"
                  disabled={sending}
                  onPress={() => setPendingImage(null)}
                  hitSlop={8}
                  style={styles.pendingRemove}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Attach photo"
                disabled={sending}
                onPress={() => void handlePickImage()}
                hitSlop={8}
                style={[styles.attachButton, sending ? styles.attachButtonDisabled : null]}
              >
                <Ionicons name="image-outline" size={22} color={colors.forest} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={styles.composerInput}
                maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
                editable={!sending}
              />
              <Button
                label={sending ? "Sending…" : "Send"}
                onPress={() => void handleSend()}
                loading={sending}
                disabled={(!draft.trim() && !pendingImage) || sending}
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
    minWidth: 0,
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
    paddingVertical: spacing.lg,
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
  attachments: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  attachmentImage: {
    width: 220,
    height: 160,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
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
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  pendingRow: {
    alignSelf: "flex-start",
    position: "relative",
  },
  pendingThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  pendingRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.full,
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
  sendErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sendError: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.error,
  },
  retry: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.forest,
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
