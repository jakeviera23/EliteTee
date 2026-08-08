import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { searchGolfCourses } from "@/lib/api/courses";
import { MAX_ROUND_PHOTOS } from "@/lib/api/courseRoundPhotos";
import { publishRoundReview } from "@/lib/api/publishRoundReview";
import { getFeedComposerValidation } from "@/lib/feedComposerValidation";
import { COURSE_RATING_MAX, COURSE_RATING_MIN, validateCourseRating } from "@/lib/courseRating";
import { formatMobileError } from "@/lib/errors";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";
import type { MobileRoundPhotoDraft } from "@/types/courseRoundPhoto";

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ShareRoundScreen() {
  const router = useRouter();
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<MobileGolfCourse[]>([]);
  const [searchingCourses, setSearchingCourses] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<MobileGolfCourse | null>(null);
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [rating, setRating] = useState("8.0");
  const [review, setReview] = useState("");
  const [playedWith, setPlayedWith] = useState("");
  const [photos, setPhotos] = useState<MobileRoundPhotoDraft[]>([]);
  const [coverDraftId, setCoverDraftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState<{ roundId: string; photosComplete: boolean } | null>(null);

  const resolvedCourseName = selectedCourse?.name ?? manualCourseName.trim();
  const resolvedLocation = selectedCourse
    ? formatGolfCourseLocation(selectedCourse)
    : manualLocation.trim();

  const validation = useMemo(
    () =>
      getFeedComposerValidation({
        message: review,
        primaryFieldValue: resolvedCourseName,
        primaryFieldLabel: "a course",
        requiresPrimaryField: true,
        ratingValue: rating,
        requiresRating: true,
      }),
    [review, resolvedCourseName, rating],
  );

  const searchCourses = useCallback(async (query: string) => {
    setSearchingCourses(true);
    const { data, error: searchError } = await searchGolfCourses({ query, limit: 8 });
    setCourseResults(data);
    if (searchError) {
      setError(formatMobileError(searchError.message));
    }
    setSearchingCourses(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchCourses(courseQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseQuery, searchCourses]);

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is required to attach round photos.");
      return;
    }

    const remaining = MAX_ROUND_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled) return;

    const nextPhotos = result.assets.map((asset, index) => ({
      id: randomId(),
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? `photo-${photos.length + index + 1}.jpg`,
      sortOrder: photos.length + index,
      caption: "",
    }));

    setPhotos((current) => [...current, ...nextPhotos].slice(0, MAX_ROUND_PHOTOS));
    if (!coverDraftId && nextPhotos[0]) {
      setCoverDraftId(nextPhotos[0].id);
    }
  }

  async function handleSubmit() {
    if (!validation.canSubmit || submitting) return;

    const ratingResult = validateCourseRating(rating);
    if (!ratingResult.ok) {
      setError(ratingResult.message);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const outcome = await publishRoundReview(
      {
        courseName: resolvedCourseName,
        location: resolvedLocation,
        golfCourseId: selectedCourse?.id ?? null,
        message: review.trim(),
        courseRating: ratingResult.value,
        playedWith: playedWith.trim() || undefined,
        photoDrafts: photos,
        coverDraftId,
      },
      pending,
    );

    setSubmitting(false);

    if (!outcome.ok) {
      setError(outcome.error);
      if (outcome.pending) {
        setPending(outcome.pending);
      }
      return;
    }

    setSuccess(true);
    setPending(null);
    setTimeout(() => {
      router.replace("/(app)");
    }, 700);
  }

  return (
    <Screen title="Share a Round" subtitle="Document a course experience with rating and photos.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      <View style={styles.field}>
        <Text style={styles.label}>Find a course</Text>
        <TextInput
          value={courseQuery}
          onChangeText={(value) => {
            setCourseQuery(value);
            setSelectedCourse(null);
          }}
          placeholder="Search the EliteTee course library"
          placeholderTextColor={colors.textTertiary}
          style={styles.singleLineInput}
        />
        {searchingCourses ? <LoadingState label="Searching courses…" /> : null}
        {!selectedCourse && courseResults.length > 0 ? (
          <View style={styles.results}>
            {courseResults.map((course) => (
              <Pressable
                key={course.id}
                onPress={() => {
                  setSelectedCourse(course);
                  setCourseQuery(course.name);
                  setManualCourseName("");
                  setManualLocation("");
                }}
                style={styles.resultRow}
              >
                <Text style={styles.resultName}>{course.name}</Text>
                <Text style={styles.resultMeta}>{formatGolfCourseLocation(course)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {!selectedCourse ? (
        <View style={styles.field}>
          <Text style={styles.label}>Or enter manually</Text>
          <TextInput
            value={manualCourseName}
            onChangeText={setManualCourseName}
            placeholder="Course name"
            placeholderTextColor={colors.textTertiary}
            style={styles.singleLineInput}
          />
          <TextInput
            value={manualLocation}
            onChangeText={setManualLocation}
            placeholder="City, region, country"
            placeholderTextColor={colors.textTertiary}
            style={styles.singleLineInput}
          />
        </View>
      ) : (
        <View style={styles.selectedCourse}>
          <Text style={styles.selectedLabel}>Selected course</Text>
          <Text style={styles.selectedName}>{selectedCourse.name}</Text>
          <Text style={styles.selectedMeta}>{formatGolfCourseLocation(selectedCourse)}</Text>
          <Button label="Change course" variant="ghost" onPress={() => setSelectedCourse(null)} />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>
          Rating ({COURSE_RATING_MIN.toFixed(1)}–{COURSE_RATING_MAX.toFixed(1)})
        </Text>
        <TextInput
          value={rating}
          onChangeText={setRating}
          keyboardType="decimal-pad"
          style={styles.singleLineInput}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Review</Text>
        <TextInput
          value={review}
          onChangeText={setReview}
          placeholder="What stood out—layout, conditions, hospitality, travel tips…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={styles.input}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{validation.characterCounterLabel}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Played with (optional)</Text>
        <TextInput
          value={playedWith}
          onChangeText={setPlayedWith}
          placeholder="Member names or playing partners"
          placeholderTextColor={colors.textTertiary}
          style={styles.singleLineInput}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Photos (up to {MAX_ROUND_PHOTOS})</Text>
        <Button
          label={photos.length > 0 ? "Add more photos" : "Choose from library"}
          variant="secondary"
          onPress={() => void pickPhotos()}
          disabled={photos.length >= MAX_ROUND_PHOTOS}
        />
        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setCoverDraftId(photo.id)}
                  style={[styles.photoWrap, coverDraftId === photo.id ? styles.photoCover : null]}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  {coverDraftId === photo.id ? (
                    <Text style={styles.coverBadge}>Cover</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      {validation.blockerMessage && (review.length > 0 || resolvedCourseName) ? (
        <Text style={styles.hint}>{validation.blockerMessage}</Text>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Round shared to the member feed.</Text>
        </View>
      ) : null}

      <Button
        label={submitting ? "Sharing…" : "Share Round"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!validation.canSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  singleLineInput: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  input: {
    minHeight: 140,
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
  counter: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "right",
  },
  results: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    overflow: "hidden",
  },
  resultRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
  },
  resultName: {
    fontFamily: typography.sansSemibold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultMeta: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  selectedCourse: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.xs,
  },
  selectedLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  selectedName: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  selectedMeta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoWrap: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  photoCover: {
    borderColor: colors.gold,
  },
  photoThumb: {
    width: 88,
    height: 88,
    backgroundColor: colors.bgSurface,
  },
  coverBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    color: colors.ivory,
    backgroundColor: colors.forest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  hint: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
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
