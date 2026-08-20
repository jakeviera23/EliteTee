export type MobileFeedComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  displayTimestamp: string;
};

export type MobileFeedPost = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorClub: string;
  authorLocation: string;
  authorAvatarUrl: string | null;
  badge: string;
  headline: string;
  message: string;
  timestamp: string;
  createdAt: string;
  imageUrls: string[];
  rating?: number;
  playedWith?: string;
  memberCourseRoundId?: string;
  golfCourseId?: string;
  courseSlug?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
};

export type MobileFeedPage = {
  posts: MobileFeedPost[];
  hasMore: boolean;
  nextCursor: { createdAt: string; id: string } | null;
};
