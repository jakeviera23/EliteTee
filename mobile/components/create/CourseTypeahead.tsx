import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { searchGolfCourses } from "@/lib/api/courses";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";

const DEFAULT_RESULT_LIMIT = 6;

type CourseTypeaheadProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  selectedCourse: MobileGolfCourse | null;
  onSelectCourse: (course: MobileGolfCourse | null) => void;
  placeholder?: string;
  /** When true, selecting a course appends its name to the current value instead of replacing. */
  appendMode?: boolean;
};

export function CourseTypeahead({
  label,
  value,
  onChangeText,
  selectedCourse,
  onSelectCourse,
  placeholder = "Search courses",
  appendMode = false,
}: CourseTypeaheadProps) {
  const [results, setResults] = useState<MobileGolfCourse[]>([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const requestId = useRef(0);

  const query = value.trim();

  const runSearch = useCallback(async (nextQuery: string) => {
    const currentRequest = ++requestId.current;
    if (!nextQuery) {
      setResults([]);
      setSearching(false);
      setMenuOpen(false);
      return;
    }

    setSearching(true);
    const { data } = await searchGolfCourses({ query: nextQuery, limit: DEFAULT_RESULT_LIMIT });
    if (currentRequest !== requestId.current) return;

    setResults(data);
    setSearching(false);
    setMenuOpen(data.length > 0);
  }, []);

  useEffect(() => {
    if (selectedCourse && !appendMode) {
      setResults([]);
      setMenuOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      void runSearch(query);
    }, 280);

    return () => clearTimeout(timer);
  }, [query, runSearch, selectedCourse, appendMode]);

  function handleSelect(course: MobileGolfCourse) {
    if (appendMode) {
      const next = value.trim()
        ? `${value.trim().replace(/,\s*$/, "")}, ${course.name}`
        : course.name;
      onChangeText(next);
      onSelectCourse(null);
      setMenuOpen(false);
      setResults([]);
      return;
    }

    onSelectCourse(course);
    onChangeText(course.name);
    setMenuOpen(false);
    setResults([]);
  }

  function handleClearSelection() {
    onSelectCourse(null);
    onChangeText("");
    setResults([]);
    setMenuOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      {selectedCourse && !appendMode ? (
        <View style={styles.selected}>
          <View style={styles.selectedCopy}>
            <Text style={styles.selectedName}>{selectedCourse.name}</Text>
            <Text style={styles.selectedMeta}>{formatGolfCourseLocation(selectedCourse)}</Text>
          </View>
          <Pressable onPress={handleClearSelection} hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={(next) => {
              if (!appendMode) onSelectCourse(null);
              onChangeText(next);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
          />

          {searching ? (
            <View style={styles.searching}>
              <ActivityIndicator size="small" color={colors.forest} />
              <Text style={styles.searchingLabel}>Searching…</Text>
            </View>
          ) : null}

          {menuOpen && results.length > 0 ? (
            <View style={styles.results}>
              {results.map((course) => (
                <Pressable
                  key={course.id}
                  onPress={() => handleSelect(course)}
                  style={({ pressed }) => [styles.resultRow, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.resultName}>{course.name}</Text>
                  <Text style={styles.resultMeta}>{formatGolfCourseLocation(course)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {query.length > 0 && !searching && results.length === 0 ? (
            <Text style={styles.emptyHint}>No matches. You can keep typing a custom name.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: typography.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  searching: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchingLabel: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  results: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    overflow: "hidden",
    backgroundColor: colors.bgElevated,
  },
  resultRow: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
  },
  pressed: {
    backgroundColor: colors.bgSurfaceHover,
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
  emptyHint: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  selectedCopy: {
    flex: 1,
    gap: 2,
  },
  selectedName: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  selectedMeta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  clear: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.forest,
  },
});
