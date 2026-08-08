import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { updateOwnProfile } from "@/lib/api/members";
import { formatMobileError } from "@/lib/errors";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobileMemberProfile } from "@/types/member";

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  if (!profile) {
    return (
      <Screen title="Edit profile" subtitle="Loading your member profile…">
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <ProfileEditForm
      key={profile.updated_at}
      profile={profile}
      onBack={() => router.back()}
      onSaved={refreshProfile}
    />
  );
}

function ProfileEditForm({
  profile,
  onBack,
  onSaved,
}: {
  profile: MobileMemberProfile;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [primaryClub, setPrimaryClub] = useState(profile.primary_club);
  const [basedIn, setBasedIn] = useState(profile.based_in);
  const [industry, setIndustry] = useState(profile.industry);
  const [currentRequest, setCurrentRequest] = useState(profile.current_request);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: saveError } = await updateOwnProfile({
      full_name: fullName.trim(),
      primary_club: primaryClub.trim(),
      based_in: basedIn.trim(),
      industry: industry.trim(),
      additional_clubs: profile.additional_clubs,
      regions: profile.regions,
      golf_interests: profile.golf_interests,
      business_interests: profile.business_interests,
      current_request: currentRequest.trim(),
      traveling_to: profile.traveling_to,
      handicap: profile.handicap,
      bucket_list_course_ids: profile.bucket_list_course_ids,
      club_logo_url: profile.club_logo_url,
      cover_photo_url: profile.cover_photo_url,
    });

    setSaving(false);

    if (saveError) {
      setError(formatMobileError(saveError.message));
      return;
    }

    await onSaved();
    setSuccess(true);
  }

  return (
    <Screen title="Edit profile" subtitle="Update the basics members see across EliteTee.">
      <Button label="Back" variant="ghost" onPress={onBack} />

      <Field label="Full name" value={fullName} onChangeText={setFullName} />
      <Field label="Primary club" value={primaryClub} onChangeText={setPrimaryClub} />
      <Field label="Based in" value={basedIn} onChangeText={setBasedIn} />
      <Field label="Industry" value={industry} onChangeText={setIndustry} />
      <Field
        label="Current request"
        value={currentRequest}
        onChangeText={setCurrentRequest}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>Profile updated.</Text> : null}

      <Button label="Save changes" onPress={() => void handleSave()} loading={saving} />
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgInset,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.sans,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  error: {
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 14,
  },
  success: {
    color: colors.success,
    fontFamily: typography.sans,
    fontSize: 14,
  },
});
