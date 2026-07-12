import { photos } from "../assets/photos";

export const MAX_RATING = 10;

export const ratingOptions = Array.from({ length: MAX_RATING }, (_, index) => MAX_RATING - index);

export const earlyStageCopy = {
  earlyCommunity: "Early community",
  foundingMember: "Founding Member",
  foundingMemberNote: "One of the first members helping shape EliteTee.",
  memberActivityPending: "No member activity yet.",
  memberActivityGrowing:
    "Member notes, recent rounds, and travel requests will appear here as founding members begin using EliteTee.",
  coursesLibraryGrowth:
    "EliteTee's course library will grow through member rounds, travel notes, and recommendations.",
  coursesIntro:
    "The course library starts with a curated set of standout destinations and grows as members add rounds they've played.",
  featuredCoursesStartingPoint:
    "These six featured courses are a starting point—not a complete database. Member rounds will expand what appears here over time.",
  curatedLibraryLabel: "Curated Course Library",
  featuredCourseLabel: "Featured Course",
  profileOnboarding:
    "Complete your profile so other founding members know where you play, where you travel, and what kind of golf connections you're looking for.",
  beAmongFirst:
    "Complete your profile so other founding members know where you play, where you travel, and what kind of golf connections you're looking for.",
  noPublicDirectory: "No public member directory until the community is active.",
  coursesGrowNote:
    "Founding Members will begin adding rounds, recommendations, and travel notes soon.",
  feedEmptyTitle: "No member posts yet",
  feedEmptyHint: "Share a round, travel plan, or introduction request to begin the conversation.",
  feedEmptyCta: "",
  discoverFoundingTitle: "Founding Members",
  discoverFoundingBody:
    "As new members join EliteTee, approved profiles will appear here.",
  discoverFoundingNote:
    "Search by location, home club, travel plans, and interests as the community grows.",
  discoverNoMatch:
    "No members match that search yet. Profiles will appear here as founding members join.",
  messagesEmptyTitle: "No conversations yet.",
  messagesEmptyBody:
    "As more founding members join EliteTee, you'll be able to connect directly, introduce yourself, and build relationships through the game.",
  messagesEmptyNote: "Start your first conversation when another member joins.",
  messagesNewEmpty: "No members available to message yet. Conversations will open as founding members join.",
  courseDiscoveryPreview: "Course discovery",
  courseMemberPhotosNote: "Member photos will appear as rounds are shared.",
  profileStatsNote: "These numbers grow as you share rounds, save courses, and connect with members.",
  connectionInterestsEmpty:
    "Share the kinds of golf connections you're looking for in Edit Profile.",
  connectionInterestsTitle: "No connection interests added yet.",
  achievementsEmpty: "No achievements yet.",
  connectionsEmpty: "No connections yet.",
  favoriteCoursesEmpty: "No saved courses yet.",
  tripsEmpty: "No trips planned yet.",
  roundsEmpty: "No rounds shared yet.",
  notificationsEmpty: "Alerts will appear as member activity grows.",
  composerCollapsedPlaceholder: "Share a round, request an introduction, or post an update…",
} as const;

/** Share an Experience — canonical round creation copy */
export const experienceCopy = {
  shareTitle: "Share an Experience",
  shareLead:
    "Document where you played, how it felt, and what fellow members should know. Experiences power the EliteTee course library, feed, and member profiles.",
  chooseCourseTitle: "Choose Course",
  chooseCourseLead: "Search the library or enter a course manually if it is not listed yet.",
  experienceTitle: "Experience",
  experienceLead: "Rate the round, capture the story, and note when you played.",
  photographyTitle: "Photography",
  photographyLead: "Optional photos from the day — they appear on your feed post and course gallery.",
  detailsTitle: "Details",
  detailsLead: "Additional context will live here as EliteTee expands the experience model.",
  shareSubmit: "Share Experience",
  shareSaving: "Sharing…",
  shareSuccessTitle: "Experience shared.",
  shareSuccessBody:
    "Thank you for contributing. Your experience helps members discover courses and plan their next round.",
  feedBadge: "Experience",
  linkedToLibrary: "Linked to EliteTee course library.",
  searchingCourses: "Searching courses…",
  manualEntry: "Course not listed — enter manually",
  reviewLabel: "Review",
  reviewPlaceholder: "What stood out—layout, conditions, hospitality, travel tips…",
  wouldPlayAgain: "Would play again?",
  futureFields: [
    { key: "tees", label: "Tees played" },
    { key: "hole", label: "Favorite hole" },
    { key: "cart", label: "Walking / riding" },
    { key: "weather", label: "Weather" },
    { key: "partners", label: "Playing partners" },
    { key: "trip", label: "Trip" },
  ] as const,
  futureFieldsNote: "These fields are coming soon. Your experience still saves with the details above.",
} as const;

/** Messages — member correspondence copy */
export const messagesCopy = {
  eyebrow: "Member Messages",
  title: "Messages",
  lead: "Private correspondence with founding members — calm, direct, and golf-connected.",
  newConversation: "New Conversation",
  backToList: "Back to conversations",
  viewProfile: "View Profile",
  selectThread: "Select a conversation",
  selectThreadHint: "Choose a member from the list or start a new conversation.",
  threadEmptyTitle: "Start the conversation",
  loadingInbox: "Loading conversations…",
  loadingThread: "Loading conversation…",
  send: "Send",
  sending: "Sending…",
  composeLabel: "Write a message",
  composePlaceholder: (name: string) => `Message ${name}…`,
  retryThread: "Retry",
} as const;

export type PostType =
  | "photo"
  | "carousel"
  | "played-today"
  | "bucket-list"
  | "golf-travel"
  | "course-review";

export type RoundType =
  | "Casual Round"
  | "Tournament"
  | "Travel Round"
  | "Practice"
  | "Bucket List";

/**
 * Composer post types — front-end only. These drive the Feed composer's
 * dynamic fields, the per-type placeholder, and the badge shown on a post.
 * Structured details live in FeedPost.details (additive, no backend change).
 */
export type ComposerPostType =
  | "round-review"
  | "looking-for-game"
  | "traveling"
  | "introduction"
  | "business-golf"
  | "general";

/** Composer button / section labels. */
export const composerPostTypeLabels: Record<ComposerPostType, string> = {
  "round-review": "Round Review",
  "looking-for-game": "Looking for a Game",
  traveling: "Traveling",
  introduction: "Introduction Request",
  "business-golf": "Business Golf",
  general: "General Discussion",
};

/** Short badge shown on the post card (rendered uppercase in CSS). */
export const composerPostTypeBadges: Record<ComposerPostType, string> = {
  "round-review": "Round Review",
  "looking-for-game": "Looking for Game",
  traveling: "Traveling",
  introduction: "Introduction",
  "business-golf": "Business Golf",
  general: "Discussion",
};

/** Per-type placeholder for the main message field. */
export const composerPostTypePlaceholders: Record<ComposerPostType, string> = {
  "round-review": "Share where you played, what stood out, and who you played with…",
  "looking-for-game": "Looking for a game in Palm Beach next week…",
  traveling: "I'll be in Scotland August 3–10 and would love to connect…",
  introduction: "Looking for an introduction to a member at Fishers Island…",
  "business-golf": "In NYC next week and open to meeting founders or investors over a round…",
  general: "Start a thoughtful golf conversation…",
};

export const composerPostTypeOrder: ComposerPostType[] = [
  "round-review",
  "looking-for-game",
  "traveling",
  "introduction",
  "business-golf",
  "general",
];

export type PortalGolfer = {
  id: string;
  name: string;
  handle: string;
  location: string;
  homeCourse: string;
  handicap?: number;
  bio: string;
  title?: string;
  isVerified: boolean;
  avatarImage?: string;
  coverImage?: string;
  followers: number;
  following: number;
  coursesPlayed: number;
  roundsPosted: number;
  countriesPlayed: number;
  favoriteCourses: string[];
  upcomingTravel?: string;
};

export type FeedPost = {
  id: string;
  postType: PostType;
  author: PortalGolfer;
  courseName: string;
  courseLocation: string;
  images: string[];
  imageAlt: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  roundType?: RoundType;
  playedWith?: string;
  rating?: number;
  weather?: string;
  score?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  commentPreview?: { author: string; text: string };
  /** Optional short badge (e.g. "Looking for Game"). Front-end only. */
  requestLabel?: string;
  /** Optional structured metadata rows (Destination, Dates, etc.). Front-end only. */
  details?: { label: string; value: string }[];
  /** Linked member course round — photos resolved from member_course_round_photos */
  memberCourseRoundId?: string;
  /** Author auth user id — used for ownership checks */
  authorUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  /** ISO date (YYYY-MM-DD) when available from linked round */
  playedOn?: string;
  wouldPlayAgain?: boolean;
};

export type CourseListing = {
  id: string;
  name: string;
  location: string;
  description: string;
  bestMonths: string;
  image: string;
  imageAlt: string;
  nearbyCourseIds: string[];
  membersPlayed: number;
  membersWantToPlay: number;
  recentActivity: string;
  tags: string[];
};

export type MessagePreview = {
  id: string;
  golferId: string;
  golferName: string;
  preview: string;
  timestamp: string;
  unread: boolean;
};

export type MessageThread = {
  id: string;
  golferId: string;
  golferName: string;
  messages: { id: string; sender: string; text: string; timestamp: string }[];
};

export const postTypeLabels: Record<PostType, string> = {
  photo: "Photo",
  carousel: "Carousel",
  "played-today": "Played Today",
  "bucket-list": "Bucket List",
  "golf-travel": "Golf Travel",
  "course-review": "Course Review",
};

export const roundTypeOptions: RoundType[] = [
  "Casual Round",
  "Tournament",
  "Travel Round",
  "Practice",
  "Bucket List",
];

const courseImageById: Record<string, string> = {
  "course-ngla": photos.courseNationalGolfLinks,
  "course-pebble": photos.coursePebbleBeach,
  "course-bandon": photos.courseBandonDunes,
  "course-standrews": photos.courseStAndrews,
  "course-cabot": photos.courseCabotCliffs,
  "course-rcd": photos.courseRoyalCountyDown,
};

export function getCourseImagePath(courseId: string): string {
  return courseImageById[courseId] ?? photos.courseNationalGolfLinks;
}

/** Fallback golfer shape for composers when profile fields are empty. */
export const emptyGolferDefaults: PortalGolfer = {
  id: "member",
  name: "Member",
  handle: "member",
  location: "",
  homeCourse: "",
  bio: "",
  isVerified: false,
  followers: 0,
  following: 0,
  coursesPlayed: 0,
  roundsPosted: 0,
  countriesPlayed: 0,
  favoriteCourses: [],
};

export const demoGolfers: PortalGolfer[] = [];

export const demoFeedPosts: FeedPost[] = [];

export const demoCourses: CourseListing[] = [
  {
    id: "course-ngla",
    name: "National Golf Links of America",
    location: "Southampton, New York",
    description:
      "Historic American links with bold landforms, wind, and a timeless sense of place.",
    bestMonths: "May – October",
    image: photos.courseNationalGolfLinks,
    imageAlt: "National Golf Links of America windmill fairway",
    nearbyCourseIds: ["course-pebble"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["private", "links"],
  },
  {
    id: "course-pebble",
    name: "Pebble Beach Golf Links",
    location: "Pebble Beach, California",
    description:
      "Iconic coastal golf above the Pacific and one of the great public golf experiences.",
    bestMonths: "April – October",
    image: photos.coursePebbleBeach,
    imageAlt: "Pebble Beach Golf Links",
    nearbyCourseIds: ["course-bandon"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["coastal", "links"],
  },
  {
    id: "course-bandon",
    name: "Bandon Dunes",
    location: "Bandon, Oregon",
    description:
      "A walking-golf destination built around dunes, ocean, wind, and multiple courses.",
    bestMonths: "June – September",
    image: photos.courseBandonDunes,
    imageAlt: "Bandon Dunes",
    nearbyCourseIds: ["course-pebble", "course-cabot"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["coastal", "links", "bucket-list"],
  },
  {
    id: "course-standrews",
    name: "St Andrews Links",
    location: "St Andrews, Scotland",
    description:
      "The home of golf, defined by history, firm turf, angles, and tradition.",
    bestMonths: "May – September",
    image: photos.courseStAndrews,
    imageAlt: "St Andrews Links",
    nearbyCourseIds: ["course-rcd"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["links", "traveling-soon"],
  },
  {
    id: "course-cabot",
    name: "Cabot Cliffs",
    location: "Inverness, Nova Scotia",
    description:
      "Dramatic cliffside golf on the Atlantic and one of the most striking modern walks.",
    bestMonths: "July – September",
    image: photos.courseCabotCliffs,
    imageAlt: "Cabot Cliffs",
    nearbyCourseIds: ["course-bandon", "course-rcd"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["coastal"],
  },
  {
    id: "course-rcd",
    name: "Royal County Down",
    location: "Newcastle, Northern Ireland",
    description:
      "Mountains, dunes, blind shots, and one of the great walking tests in golf.",
    bestMonths: "June – August",
    image: photos.courseRoyalCountyDown,
    imageAlt: "Royal County Down",
    nearbyCourseIds: ["course-standrews"],
    membersPlayed: 0,
    membersWantToPlay: 0,
    recentActivity: "",
    tags: ["links", "coastal", "bucket-list"],
  },
];

export const demoMessagePreviews: MessagePreview[] = [];

export const demoMessageThreads: Record<string, MessageThread> = {};

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getCourseById(id: string) {
  return demoCourses.find((course) => course.id === id);
}

export function getPostsForCourse(_courseName: string) {
  return demoFeedPosts.filter((post) => post.courseName === _courseName);
}
