export function clampPhotoGalleryIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export function getPhotoGalleryNavigation(index: number, length: number) {
  const clampedIndex = clampPhotoGalleryIndex(index, length);

  return {
    index: clampedIndex,
    canGoPrev: length > 1 && clampedIndex > 0,
    canGoNext: length > 1 && clampedIndex < length - 1,
    prevIndex: clampedIndex > 0 ? clampedIndex - 1 : null,
    nextIndex: clampedIndex < length - 1 ? clampedIndex + 1 : null,
  };
}
