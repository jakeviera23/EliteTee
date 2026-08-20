import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MemberCard } from "@/components/discover/MemberCard";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  buildIntroductionRecommendations,
  cancelIntroductionRequest,
  createIntroductionRequest,
  fetchIntroductionRequests,
  updateIntroductionRequestStatus,
} from "@/lib/api/introductions";
import { fetchDiscoverableMembers, fetchMemberByUserId } from "@/lib/api/members";
import { buildIntroductionAcceptedMessageDraft } from "@/lib/connectionMessageDraft";
import {
  categorizeIntroductionRequests,
  getIntroductionCounterpartContext,
  getIntroductionCounterpartName,
  getIntroductionCounterpartPhotoUrl,
  getIntroductionCounterpartUserId,
  getIntroductionDirectionLabel,
  getIntroductionStatusLabel,
} from "@/lib/introductionBoard";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { useAuth } from "@/hooks/AuthProvider";
import {
  INTRODUCTION_REQUEST_TYPES,
  type IntroductionRequestType,
  type IntroductionTab,
  type MobileIntroductionRequest,
} from "@/types/introduction";
import type { MobileMemberProfile } from "@/types/member";

const TAB_LABELS: Record<IntroductionTab, string> = {
  incoming: "Incoming",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

const INTRO_MESSAGE_MIN_LENGTH = 20;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

function toMemberFromFetch(
  member: MobileMemberProfile,
  fallbackName?: string,
): MobileMemberProfile {
  return {
    ...member,
    full_name: getMemberDisplayName(member.full_name) || fallbackName || "Member",
  };
}

export default function IntroductionsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{
    targetUserId?: string;
    targetMemberName?: string;
    openComposer?: string;
  }>();
  const targetUserId = firstParam(params.targetUserId);
  const targetMemberName = firstParam(params.targetMemberName);
  const openComposer = firstParam(params.openComposer) === "1" || Boolean(targetUserId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MobileIntroductionRequest[]>([]);
  const [members, setMembers] = useState<MobileMemberProfile[]>([]);
  const [activeTab, setActiveTab] = useState<IntroductionTab>("incoming");
  const [selectedMember, setSelectedMember] = useState<MobileMemberProfile | null>(null);
  const [requestType, setRequestType] = useState<IntroductionRequestType>(
    INTRODUCTION_REQUEST_TYPES[0],
  );
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const targetApplied = useRef(false);
  const returnedFromProfile = useRef(Boolean(targetUserId));

  const loadData = useCallback(async (options?: { pull?: boolean }) => {
    if (options?.pull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const [requestsResult, membersResult] = await Promise.all([
      fetchIntroductionRequests(),
      fetchDiscoverableMembers(),
    ]);

    setRequests(requestsResult.data);
    setMembers(membersResult.data);
    setError(
      requestsResult.error
        ? formatMobileError(requestsResult.error.message)
        : membersResult.error
          ? formatMobileError(membersResult.error.message)
          : null,
    );
    setLoading(false);
    setRefreshing(false);
    return { members: membersResult.data };
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!openComposer || !targetUserId || targetApplied.current) return;

    let active = true;
    void (async () => {
      const fromDirectory = members.find((member) => member.user_id === targetUserId);
      if (fromDirectory) {
        if (!active) return;
        setSelectedMember(fromDirectory);
        targetApplied.current = true;
        return;
      }

      if (loading) return;

      const { data } = await fetchMemberByUserId(targetUserId);
      if (!active) return;
      if (data) {
        setSelectedMember(toMemberFromFetch(data, targetMemberName));
      } else if (targetMemberName) {
        setSelectedMember({
          id: targetUserId,
          user_id: targetUserId,
          full_name: targetMemberName,
          email: "",
          primary_club: "",
          additional_clubs: [],
          based_in: "",
          regions: [],
          industry: "",
          golf_interests: [],
          business_interests: [],
          current_request: "",
          traveling_to: "",
          handicap: "",
          bucket_list_course_ids: [],
          club_logo_url: null,
          cover_photo_url: null,
          membership_status: "",
          is_verified: false,
          founding_member_number: null,
          portal_access_enabled: true,
          created_at: "",
          updated_at: "",
        });
      }
      targetApplied.current = true;
    })();

    return () => {
      active = false;
    };
  }, [openComposer, targetUserId, targetMemberName, members, loading]);

  const categorized = useMemo(
    () => categorizeIntroductionRequests(requests, user?.id ?? null),
    [requests, user?.id],
  );

  const recommendations = useMemo(
    () =>
      buildIntroductionRecommendations({
        viewer: profile,
        members,
        requests,
        limit: 5,
      }),
    [profile, members, requests],
  );

  const messageLength = requestMessage.trim().length;
  const canSubmitRequest =
    Boolean(selectedMember) && messageLength >= INTRO_MESSAGE_MIN_LENGTH && !submitting;

  async function handleCreateRequest() {
    if (!selectedMember || submitting || !canSubmitRequest) return;

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const { error: createError } = await createIntroductionRequest({
      receiverMember: selectedMember,
      requestType,
      message: requestMessage,
    });

    setSubmitting(false);

    if (createError) {
      setActionError(formatMobileError(createError.message));
      return;
    }

    setActionSuccess("Introduction request sent.");
    setSelectedMember(null);
    setRequestMessage("");
    await loadData();

    if (returnedFromProfile.current) {
      setTimeout(() => router.back(), 600);
    }
  }

  async function handleRespond(requestId: string, status: "accepted" | "declined") {
    if (updatingRequestId) return;
    setUpdatingRequestId(requestId);
    setActionError(null);
    setActionSuccess(null);

    const { error: respondError } = await updateIntroductionRequestStatus(requestId, status);
    setUpdatingRequestId(null);

    if (respondError) {
      setActionError(formatMobileError(respondError.message));
      return;
    }

    setActionSuccess(status === "accepted" ? "Introduction accepted." : "Introduction declined.");
    void loadData();
  }

  async function handleCancel(requestId: string) {
    if (updatingRequestId) return;
    setUpdatingRequestId(requestId);
    setActionError(null);
    setActionSuccess(null);

    const { error: cancelError } = await cancelIntroductionRequest(requestId);
    setUpdatingRequestId(null);

    if (cancelError) {
      setActionError(formatMobileError(cancelError.message));
      return;
    }

    setActionSuccess("Request withdrawn.");
    void loadData();
  }

  function openMessage(request: MobileIntroductionRequest) {
    const counterpartUserId = getIntroductionCounterpartUserId(request, user?.id ?? "");
    const counterpartName = getIntroductionCounterpartName(request, user?.id ?? "");
    router.push({
      pathname: "/(app)/messages/[userId]",
      params: {
        userId: counterpartUserId,
        memberName: counterpartName,
        prefill: buildIntroductionAcceptedMessageDraft(counterpartName),
      },
    });
  }

  return (
    <Screen
      title="Introductions"
      subtitle="Recommendations and introduction requests."
      refreshing={refreshing}
      onRefresh={() => void loadData({ pull: true })}
    >
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      {loading ? <LoadingState label="Loading introductions…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadData()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {actionError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      {actionSuccess ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionSuccess}</Text>
        </View>
      ) : null}

      {!loading ? (
        <>
          <Text style={styles.sectionTitle}>Recommended members</Text>
          {recommendations.length === 0 ? (
            <EmptyState
              title="No recommendations right now"
              body="Recommendations appear as your profile and the member directory grow."
            />
          ) : (
            recommendations.map(({ member, reasons }) => (
              <View key={member.id} style={styles.recommendation}>
                <MemberCard
                  member={member}
                  onPress={() =>
                    member.user_id ? router.push(`/members/${member.user_id}`) : undefined
                  }
                />
                {reasons.map((reason) => (
                  <Text key={reason} style={styles.reason}>
                    {reason}
                  </Text>
                ))}
                <Button
                  label="Request introduction"
                  variant="secondary"
                  onPress={() => {
                    setSelectedMember(member);
                    setRequestMessage("");
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                />
              </View>
            ))
          )}

          <View style={styles.tabs}>
            {(Object.keys(TAB_LABELS) as IntroductionTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
              >
                <Text style={[styles.tabLabel, activeTab === tab ? styles.tabLabelActive : null]}>
                  {TAB_LABELS[tab]} ({categorized[tab].length})
                </Text>
              </Pressable>
            ))}
          </View>

          {categorized[activeTab].length === 0 ? (
            <EmptyState
              title={`No ${TAB_LABELS[activeTab].toLowerCase()} requests`}
              body={
                activeTab === "declined"
                  ? "Declined and withdrawn requests appear here."
                  : "Introduction activity appears here as members connect."
              }
            />
          ) : (
            categorized[activeTab].map((request) => {
              const counterpartName = getIntroductionCounterpartName(request, user?.id ?? "");
              const counterpartUserId = getIntroductionCounterpartUserId(request, user?.id ?? "");
              const counterpartPhoto = getIntroductionCounterpartPhotoUrl(request, user?.id ?? "");
              const counterpartContext = getIntroductionCounterpartContext(
                request,
                user?.id ?? "",
              );
              const contextLine = formatMemberContextLine([
                formatPrimaryClubLine(counterpartContext.primaryClub),
                counterpartContext.basedIn,
              ]);
              const busy = updatingRequestId === request.id;

              return (
                <View key={request.id} style={styles.requestCard}>
                  <MemberIdentityLink
                    userId={counterpartUserId}
                    name={counterpartName}
                    avatarUrl={counterpartPhoto}
                    subtitle={contextLine || undefined}
                    size={44}
                  />
                  <View style={styles.badgeRow}>
                    <Text style={styles.directionBadge}>
                      {getIntroductionDirectionLabel(request, user?.id ?? "")}
                    </Text>
                    <Text style={styles.statusBadge}>
                      {getIntroductionStatusLabel(request, user?.id ?? "")}
                    </Text>
                  </View>
                  <Text style={styles.requestType}>{request.request_type}</Text>
                  {request.message?.trim() ? (
                    <Text style={styles.requestMessage}>{request.message}</Text>
                  ) : null}
                  <Text style={styles.requestMeta}>
                    {new Date(request.created_at).toLocaleString()}
                  </Text>

                  {activeTab === "incoming" ? (
                    <View style={styles.actions}>
                      <Button
                        label={busy ? "…" : "Accept"}
                        onPress={() => void handleRespond(request.id, "accepted")}
                        disabled={Boolean(updatingRequestId)}
                        loading={busy}
                      />
                      <Button
                        label="Decline"
                        variant="secondary"
                        onPress={() => void handleRespond(request.id, "declined")}
                        disabled={Boolean(updatingRequestId)}
                      />
                    </View>
                  ) : null}

                  {activeTab === "sent" ? (
                    <Button
                      label={busy ? "…" : "Withdraw request"}
                      variant="ghost"
                      onPress={() => void handleCancel(request.id)}
                      disabled={Boolean(updatingRequestId)}
                      loading={busy}
                    />
                  ) : null}

                  {activeTab === "accepted" ? (
                    <Button
                      label="Continue conversation"
                      variant="secondary"
                      onPress={() => openMessage(request)}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </>
      ) : null}

      {selectedMember ? (
        <View style={styles.modal}>
          <Text style={styles.sectionTitle}>Request introduction</Text>

          <Text style={styles.fieldLabel}>Person you would like to meet</Text>
          <MemberCard
            member={selectedMember}
            onPress={() =>
              selectedMember.user_id
                ? router.push(`/members/${selectedMember.user_id}`)
                : undefined
            }
          />

          <Text style={styles.fieldLabel}>Why you would like the introduction</Text>
          <View style={styles.typeRow}>
            {INTRODUCTION_REQUEST_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setRequestType(type)}
                style={[styles.typeChip, requestType === type ? styles.typeChipActive : null]}
              >
                <Text
                  style={[
                    styles.typeChipLabel,
                    requestType === type ? styles.typeChipLabelActive : null,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={requestMessage}
            onChangeText={setRequestMessage}
            placeholder="Share why you would like an introduction…"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            {messageLength >= INTRO_MESSAGE_MIN_LENGTH
              ? `${INTRO_MESSAGE_MIN_LENGTH} character minimum met`
              : messageLength === 0
                ? `${INTRO_MESSAGE_MIN_LENGTH} characters minimum`
                : `${INTRO_MESSAGE_MIN_LENGTH - messageLength} more characters needed`}
          </Text>
          <View style={styles.actions}>
            <Button
              label={submitting ? "Sending…" : "Send request"}
              onPress={() => void handleCreateRequest()}
              loading={submitting}
              disabled={!canSubmitRequest}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setSelectedMember(null);
                setRequestMessage("");
              }}
              disabled={submitting}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recommendation: {
    gap: spacing.sm,
  },
  reason: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tab: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgElevated,
  },
  tabActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  tabLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.gold,
  },
  requestCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  directionBadge: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    color: colors.forest,
    backgroundColor: colors.forestSoft,
    overflow: "hidden",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusBadge: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    color: colors.gold,
    backgroundColor: colors.goldSoft,
    overflow: "hidden",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requestType: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  requestMessage: {
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  requestMeta: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  modal: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeChipActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  typeChipLabel: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },
  typeChipLabelActive: {
    color: colors.gold,
  },
  input: {
    minHeight: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  hint: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  errorBox: {
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
  retry: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
  successBox: {
    padding: spacing.lg,
    backgroundColor: colors.forestSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  successText: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
});
