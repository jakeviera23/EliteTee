import { useRef, useState } from "react";
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
};

export function FeedPhotoGallery({ imageUrls, rating }: FeedPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const heroListRef = useRef<FlatList<string>>(null);
  const lightboxListRef = useRef<FlatList<string>>(null);

  const urls = imageUrls.filter((url) => url.trim() && !failedUrls[url]);
  if (urls.length === 0) return null;

  const width = Dimensions.get("window").width - spacing.lg * 2 - spacing.xl * 2;
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

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
    requestAnimationFrame(() => {
      lightboxListRef.current?.scrollToIndex({ index, animated: false });
    });
  }

  function selectThumb(index: number) {
    setActiveIndex(index);
    heroListRef.current?.scrollToIndex({ index, animated: true });
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
          renderItem={({ item, index }) => (
            <Pressable onPress={() => openLightbox(index)}>
              <Image
                source={{ uri: item }}
                style={[styles.hero, { width }]}
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
