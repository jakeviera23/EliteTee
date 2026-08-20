import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MemberCard } from "@/components/discover/MemberCard";
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
import { fetchDiscoverableMembers } from "@/lib/api/members";
import {
  categorizeIntroductionRequests,
  getIntroductionCounterpartName,
  getIntroductionCounterpartUserId,
} from "@/lib/introductionBoard";
import { formatMobileError } from "@/lib/errors";
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

export default function IntroductionsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  async function handleCreateRequest() {
    if (!selectedMember || submitting) return;

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
    void loadData();
  }

  async function handleRespond(requestId: string, status: "accepted" | "declined") {
    setActionError(null);
    setActionSuccess(null);

    const { error: respondError } = await updateIntroductionRequestStatus(requestId, status);
    if (respondError) {
      setActionError(formatMobileError(respondError.message));
      return;
    }

    setActionSuccess(status === "accepted" ? "Introduction accepted." : "Introduction declined.");
    void loadData();
  }

  async function handleCancel(requestId: string) {
    setActionError(null);
    setActionSuccess(null);

    const { error: cancelError } = await cancelIntroductionRequest(requestId);
    if (cancelError) {
      setActionError(formatMobileError(cancelError.message));
      return;
    }

    setActionSuccess("Request withdrawn.");
    void loadData();
  }

  return (
    <Screen title="Introductions" subtitle="Recommendations and introduction requests.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      {loading ? <LoadingState label="Loading introductions…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
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
                <MemberCard member={member} />
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
              body="Introduction activity appears here as members connect."
            />
          ) : (
            categorized[activeTab].map((request) => {
              const counterpartName = getIntroductionCounterpartName(request, user?.id ?? "");
              const counterpartUserId = getIntroductionCounterpartUserId(request, user?.id ?? "");

              return (
                <View key={request.id} style={styles.requestCard}>
                  <Text style={styles.requestName}>{counterpartName}</Text>
                  <Text style={styles.requestType}>{request.request_type}</Text>
                  <Text style={styles.requestMessage}>{request.message}</Text>
                  <Text style={styles.requestMeta}>
                    {new Date(request.created_at).toLocaleString()}
                  </Text>

                  {activeTab === "incoming" ? (
                    <View style={styles.actions}>
                      <Button
                        label="Accept"
                        onPress={() => void handleRespond(request.id, "accepted")}
                      />
                      <Button
                        label="Decline"
                        variant="secondary"
                        onPress={() => void handleRespond(request.id, "declined")}
                      />
                    </View>
                  ) : null}

                  {activeTab === "sent" ? (
                    <Button
                      label="Withdraw request"
                      variant="ghost"
                      onPress={() => void handleCancel(request.id)}
                    />
                  ) : null}

                  {activeTab === "accepted" ? (
                    <Button
                      label="Message"
                      variant="secondary"
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/messages/[userId]",
                          params: { userId: counterpartUserId, memberName: counterpartName },
                        })
                      }
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
          <Text style={styles.requestName}>{selectedMember.full_name}</Text>
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
          <View style={styles.actions}>
            <Button
              label={submitting ? "Sending…" : "Send request"}
              onPress={() => void handleCreateRequest()}
              loading={submitting}
              disabled={!requestMessage.trim()}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setSelectedMember(null)} />
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
  requestName: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
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
    color: colors.ivory,
  },
});
