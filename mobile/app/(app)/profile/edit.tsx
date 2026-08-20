import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { updateOwnProfile } from "@/lib/api/members";
import {
  deleteMemberMediaPath,
  resolveMemberMediaUrl,
  uploadMemberAvatarPhoto,
  uploadMemberCoverPhoto,
} from "@/lib/api/memberProfileMedia";
import { formatMobileError } from "@/lib/errors";
import { formatListInput, parseListInput } from "@/lib/listInput";
import { getMemberDisplayName } from "@/lib/memberInitials";
import {
  invalidateSessionCache,
  SESSION_CACHE_KEYS,
} from "@/lib/sessionCache";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobileMemberProfile } from "@/types/member";

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, refreshProfile, user } = useAuth();

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
      userId={user?.id ?? null}
      onBack={() => router.back()}
      onSaved={refreshProfile}
    />
  );
}

function ProfileEditForm({
  profile,
  userId,
  onBack,
  onSaved,
}: {
  profile: MobileMemberProfile;
  userId: string | null;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [basedIn, setBasedIn] = useState(profile.based_in);
  const [industry, setIndustry] = useState(profile.industry);
  const [primaryClub, setPrimaryClub] = useState(profile.primary_club);
  const [favoriteCourses, setFavoriteCourses] = useState(
    formatListInput(profile.additional_clubs),
  );
  const [handicap, setHandicap] = useState(profile.handicap);
  const [currentRequest, setCurrentRequest] = useState(profile.current_request);
  const [golfInterests, setGolfInterests] = useState(formatListInput(profile.golf_interests));
  const [travelingTo, setTravelingTo] = useState(profile.traveling_to);
  const [businessInterests, setBusinessInterests] = useState(
    formatListInput(profile.business_interests),
  );
  const [avatarPath, setAvatarPath] = useState(profile.club_logo_url);
  const [coverPath, setCoverPath] = useState(profile.cover_photo_url);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const displayName = getMemberDisplayName(fullName) || "You";

  const dirty = useMemo(() => {
    return (
      fullName.trim() !== profile.full_name.trim() ||
      basedIn.trim() !== profile.based_in.trim() ||
      industry.trim() !== profile.industry.trim() ||
      primaryClub.trim() !== profile.primary_club.trim() ||
      formatListInput(parseListInput(favoriteCourses)) !==
        formatListInput(profile.additional_clubs) ||
      handicap.trim() !== profile.handicap.trim() ||
      currentRequest.trim() !== profile.current_request.trim() ||
      formatListInput(parseListInput(golfInterests)) !==
        formatListInput(profile.golf_interests) ||
      travelingTo.trim() !== profile.traveling_to.trim() ||
      formatListInput(parseListInput(businessInterests)) !==
        formatListInput(profile.business_interests) ||
      (avatarPath ?? null) !== (profile.club_logo_url ?? null) ||
      (coverPath ?? null) !== (profile.cover_photo_url ?? null)
    );
  }, [
    fullName,
    basedIn,
    industry,
    primaryClub,
    favoriteCourses,
    handicap,
    currentRequest,
    golfInterests,
    travelingTo,
    businessInterests,
    avatarPath,
    coverPath,
    profile,
  ]);

  async function pickAndUpload(kind: "avatar" | "cover") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is required to update profile media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: kind === "avatar" ? 0.8 : 0.85,
      aspect: kind === "avatar" ? [1, 1] : [16, 9],
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setError(null);

    if (kind === "avatar") {
      setUploadingAvatar(true);
      setAvatarPreview(asset.uri);
      const previous = avatarPath;
      const { path, error: uploadError } = await uploadMemberAvatarPhoto(
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );
      setUploadingAvatar(false);
      if (uploadError || !path) {
        setAvatarPreview(null);
        setError(formatMobileError(uploadError?.message ?? "Avatar upload failed."));
        return;
      }
      setAvatarPath(path);
      if (previous && previous !== path) {
        void deleteMemberMediaPath(previous);
      }
      return;
    }

    setUploadingCover(true);
    setCoverPreview(asset.uri);
    const previous = coverPath;
    const { path, error: uploadError } = await uploadMemberCoverPhoto(
      asset.uri,
      asset.mimeType ?? "image/jpeg",
    );
    setUploadingCover(false);
    if (uploadError || !path) {
      setCoverPreview(null);
      setError(formatMobileError(uploadError?.message ?? "Cover upload failed."));
      return;
    }
    setCoverPath(path);
    if (previous && previous !== path) {
      void deleteMemberMediaPath(previous);
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Name is required.";
    if (!basedIn.trim()) next.basedIn = "Location is required.";
    if (!primaryClub.trim()) next.primaryClub = "Home club is required.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (saving || uploadingAvatar || uploadingCover) return;
    if (!validate()) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: saveError } = await updateOwnProfile({
      full_name: fullName.trim(),
      primary_club: primaryClub.trim(),
      based_in: basedIn.trim(),
      industry: industry.trim(),
      additional_clubs: parseListInput(favoriteCourses),
      regions: profile.regions,
      golf_interests: parseListInput(golfInterests),
      business_interests: parseListInput(businessInterests),
      current_request: currentRequest.trim(),
      traveling_to: travelingTo.trim(),
      handicap: handicap.trim(),
      bucket_list_course_ids: profile.bucket_list_course_ids,
      club_logo_url: avatarPath,
      cover_photo_url: coverPath,
    });

    setSaving(false);

    if (saveError) {
      setError(formatMobileError(saveError.message));
      return;
    }

    if (userId) {
      invalidateSessionCache(SESSION_CACHE_KEYS.profileIdentity(userId));
      invalidateSessionCache(SESSION_CACHE_KEYS.profileSecondary(userId));
      invalidateSessionCache(SESSION_CACHE_KEYS.profileFeedPosts(userId));
    }

    await onSaved();
    setSuccess(true);
  }

  function handleBack() {
    if (!dirty) {
      onBack();
      return;
    }
    Alert.alert("Discard changes?", "You have unsaved profile edits.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onBack },
    ]);
  }

  return (
    <Screen title="Edit profile" subtitle="Keep your EliteTee identity current.">
      <Button label="Back" variant="ghost" onPress={handleBack} />

      <Text style={styles.sectionLabel}>Photos</Text>
      <View style={styles.mediaCard}>
        <Pressable
          onPress={() => void pickAndUpload("cover")}
          disabled={uploadingCover || saving}
          style={styles.coverButton}
        >
          {coverPreview || coverPath ? (
            <CoverPreview path={coverPath} localUri={coverPreview} />
          ) : (
            <View style={styles.coverEmpty}>
              <Text style={styles.mediaHint}>
                {uploadingCover ? "Uploading cover…" : "Add cover photo"}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={styles.avatarRow}>
          <MemberAvatar
            name={displayName}
            imageUrl={avatarPreview ?? avatarPath}
            size={72}
          />
          <Button
            label={uploadingAvatar ? "Uploading…" : avatarPath ? "Change photo" : "Add photo"}
            variant="secondary"
            onPress={() => void pickAndUpload("avatar")}
            loading={uploadingAvatar}
            disabled={saving}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Identity</Text>
      <Field
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
      />
      <Field
        label="Location"
        value={basedIn}
        onChangeText={setBasedIn}
        error={fieldErrors.basedIn}
        placeholder="City, region"
      />
      <Field
        label="Industry or headline"
        value={industry}
        onChangeText={setIndustry}
        placeholder="What you do"
      />

      <Text style={styles.sectionLabel}>Golf</Text>
      <Field
        label="Home club"
        value={primaryClub}
        onChangeText={setPrimaryClub}
        error={fieldErrors.primaryClub}
      />
      <Field
        label="Handicap"
        value={handicap}
        onChangeText={setHandicap}
        placeholder="e.g. 8.4"
      />
      <Field
        label="Favorite courses"
        value={favoriteCourses}
        onChangeText={setFavoriteCourses}
        multiline
        hint="One per line, or comma-separated"
      />

      <Text style={styles.sectionLabel}>Looking for</Text>
      <Field
        label="What you are looking for"
        value={currentRequest}
        onChangeText={setCurrentRequest}
        multiline
        hint="Shown on your profile to help members connect with you"
      />

      <Text style={styles.sectionLabel}>Interests</Text>
      <Field
        label="Golf / connection interests"
        value={golfInterests}
        onChangeText={setGolfInterests}
        multiline
        hint="One per line, or comma-separated"
      />
      <Field
        label="Business interests"
        value={businessInterests}
        onChangeText={setBusinessInterests}
        multiline
        hint="One per line, or comma-separated"
      />

      <Text style={styles.sectionLabel}>Travel</Text>
      <Field
        label="Upcoming golf travel"
        value={travelingTo}
        onChangeText={setTravelingTo}
        placeholder="Destinations or timing"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>Profile updated.</Text> : null}

      <Button
        label={saving ? "Saving…" : "Save changes"}
        onPress={() => void handleSave()}
        loading={saving}
        disabled={uploadingAvatar || uploadingCover || saving}
      />
    </Screen>
  );
}

function CoverPreview({ path, localUri }: { path: string | null; localUri: string | null }) {
  const [uri, setUri] = useState<string | null>(localUri);

  useEffect(() => {
    let active = true;
    if (localUri) {
      setUri(localUri);
      return () => {
        active = false;
      };
    }
    if (!path) {
      setUri(null);
      return () => {
        active = false;
      };
    }
    void resolveMemberMediaUrl(path).then((resolved) => {
      if (active) setUri(resolved);
    });
    return () => {
      active = false;
    };
  }, [path, localUri]);

  if (!uri) {
    return (
      <View style={styles.coverEmpty}>
        <Text style={styles.mediaHint}>Loading cover…</Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={styles.coverImage} />;
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          error ? styles.inputError : null,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: spacing.sm,
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  mediaCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
  },
  coverButton: {
    overflow: "hidden",
    borderRadius: radii.md,
  },
  coverImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.bgInset,
  },
  coverEmpty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgInset,
  },
  mediaHint: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
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
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  fieldError: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.error,
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
