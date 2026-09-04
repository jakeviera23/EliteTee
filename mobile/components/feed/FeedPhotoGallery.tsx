import { useRef, useState, type RefObject } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";

type FeedPhotoGalleryProps = {
  imageUrls: string[];
  rating?: number;
  /** Override hero width when embedded in non-feed layouts (e.g. course review cards). */
  contentWidth?: number;
};

function isUsableImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Signed media and public HTTPS only — never render storage paths or placeholders.
  if (!/^https?:\/\//i.test(trimmed)) return false;
  // Never pass raw video URLs into <Image>.
  if (/\.(mp4|mov|m4v|webm|avi)(\?|$)/i.test(trimmed)) return false;
  return true;
}

export function FeedPhotoGallery({ imageUrls, rating, contentWidth }: FeedPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const heroListRef = useRef<FlatList<string>>(null);
  const lightboxListRef = useRef<FlatList<string>>(null);

  const urls = imageUrls.filter((url) => isUsableImageUrl(url) && !failedUrls[url]);
  if (urls.length === 0) return null;

  const width =
    contentWidth ?? Dimensions.get("window").width - spacing.lg * 2 - spacing.xl * 2;
  const safeIndex = Math.min(activeIndex, urls.length - 1);

  function markFailed(url: string) {
    setFailedUrls((current) => ({ ...current, [url]: true }));
  }

  function handleHeroMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex >= 0 && nextIndex < urls.length) {
      setActiveIndex(nextIndex);
    }
  }

  function handleLightboxMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const screenWidth = Dimensions.get("window").width;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    if (nextIndex >= 0 && nextIndex < urls.length) {
      setActiveIndex(nextIndex);
    }
  }

  function scrollToIndexSafely(
    listRef: RefObject<FlatList<string> | null>,
    index: number,
    animated: boolean,
  ) {
    const clamped = Math.max(0, Math.min(index, urls.length - 1));
    try {
      listRef.current?.scrollToIndex({ index: clamped, animated });
    } catch {
      listRef.current?.scrollToOffset({
        offset: clamped * (listRef === lightboxListRef ? Dimensions.get("window").width : width),
        animated,
      });
    }
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
    requestAnimationFrame(() => {
      scrollToIndexSafely(lightboxListRef, index, false);
    });
  }

  function selectThumb(index: number) {
    setActiveIndex(index);
    scrollToIndexSafely(heroListRef, index, true);
  }

  function handleScrollToIndexFailed(info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) {
    const target = Math.max(0, Math.min(info.index, urls.length - 1));
    const offset = target * width;
    heroListRef.current?.scrollToOffset({ offset, animated: false });
    requestAnimationFrame(() => {
      scrollToIndexSafely(heroListRef, target, false);
    });
  }

  function handleLightboxScrollToIndexFailed(info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) {
    const target = Math.max(0, Math.min(info.index, urls.length - 1));
    const screenWidth = Dimensions.get("window").width;
    lightboxListRef.current?.scrollToOffset({
      offset: target * screenWidth,
      animated: false,
    });
    requestAnimationFrame(() => {
      scrollToIndexSafely(lightboxListRef, target, false);
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={{ width }}>
        <FlatList
          ref={heroListRef}
          data={urls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url, index) => `${url}-${index}`}
          onMomentumScrollEnd={handleHeroMomentumEnd}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => openLightbox(index)}>
              <Image
                source={{ uri: item }}
                style={[styles.hero, { width }]}
                resizeMode="cover"
                onError={() => markFailed(item)}
              />
            </Pressable>
          )}
        />
        {rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
        {urls.length > 1 ? (
          <View style={styles.pageDots}>
            {urls.map((url, index) => (
              <View
                key={`dot-${url}-${index}`}
                style={[styles.dot, safeIndex === index ? styles.dotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {urls.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
          {urls.map((url, index) => (
            <Pressable key={`${url}-${index}`} onPress={() => selectThumb(index)}>
              <Image
                source={{ uri: url }}
                style={[styles.thumb, safeIndex === index ? styles.thumbActive : null]}
                resizeMode="cover"
                onError={() => markFailed(url)}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxOpen(false)}>
            <Text style={styles.lightboxCloseLabel}>Close</Text>
          </Pressable>
          <FlatList
            ref={lightboxListRef}
            data={urls}
            horizontal
            pagingEnabled
            initialScrollIndex={safeIndex}
            getItemLayout={(_, index) => ({
              length: Dimensions.get("window").width,
              offset: Dimensions.get("window").width * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(url, index) => `lightbox-${url}-${index}`}
            onMomentumScrollEnd={handleLightboxMomentumEnd}
            onScrollToIndexFailed={handleLightboxScrollToIndexFailed}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={[
                  styles.lightboxImage,
                  { width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.7 },
                ]}
                resizeMode="contain"
                onError={() => markFailed(item)}
              />
            )}
          />
          <Text style={styles.lightboxMeta}>
            {safeIndex + 1} / {urls.length}
          </Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hero: {
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.bgInset,
  },
  ratingBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.forest,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  ratingText: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.label,
    color: colors.textInverse,
  },
  pageDots: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(244, 241, 234, 0.45)",
  },
  dotActive: {
    backgroundColor: colors.ivory,
    width: 16,
  },
  thumbRow: {
    flexGrow: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.bgInset,
  },
  thumbActive: {
    borderColor: colors.gold,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(28, 33, 29, 0.92)",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: spacing.xxxl,
    right: spacing.xl,
    zIndex: 2,
    padding: spacing.sm,
  },
  lightboxCloseLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.ivory,
  },
  lightboxImage: {
    alignSelf: "center",
  },
  lightboxMeta: {
    position: "absolute",
    bottom: spacing.xxxl,
    alignSelf: "center",
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.ivory,
  },
});
