import { photos } from "../assets/photos";

export const MAX_RATING = 10;

export const ratingOptions = Array.from({ length: MAX_RATING }, (_, index) => MAX_RATING - index);

export const earlyStageCopy = {
  earlyCommunity: "Member network",
  foundingMember: "Founding Member",
  foundingMemberNote: "Part of EliteTee's founding member cohort.",
  memberActivityPending: "No member activity yet.",
  memberActivityGrowing:
    "Member notes, recent rounds, and travel requests appear here as members share activity.",
  coursesLibraryGrowth:
    "The course library grows through member experiences, travel notes, and recommendations.",
  coursesIntro:
    "Explore standout destinations and member-submitted courses from the EliteTee network.",
  featuredCoursesStartingPoint:
    "Featured courses highlight destinations members are talking about. The library expands as experiences are shared.",
  curatedLibraryLabel: "Course library",
  featuredCourseLabel: "Featured course",
  profileOnboarding:
    "Complete your profile so members know where you play, where you travel, and what connections you're looking for.",
  beAmongFirst:
    "Complete your profile so members know where you play, where you travel, and what connections you're looking for.",
  noPublicDirectory: "Member profiles are visible to approved portal members.",
  coursesGrowNote:
    "Members add rounds, recommendations, and travel notes as they share experiences.",
  feedEmptyTitle: "No member posts yet",
  feedEmptyHint: "Share a round, travel plan, or introduction request to begin the conversation.",
  feedEmptyCta: "",
  discoverFoundingTitle: "Members",
  discoverFoundingBody: "Approved member profiles appear here as the directory grows.",
  discoverFoundingNote: "Search by location, home club, travel plans, and interests.",
  discoverNoMatch: "No members match that search. Try broadening your filters or search terms.",
  messagesEmptyTitle: "No conversations yet",
  messagesEmptyBody:
    "After you accept an introduction, your conversations will appear here. Existing conversations remain available.",
  messagesEmptyNote: "Use New Conversation to message a connected member.",
  messagesNewEmpty:
    "No connected members to message yet. Request an introduction from Discover or a member profile.",
  courseDiscoveryPreview: "Course discovery",
  courseMemberPhotosNote: "Member photos appear as experiences are shared.",
  profileStatsNote: "These numbers grow as you share rounds, save courses, and connect with members.",
  connectionInterestsEmpty:
    "Share the kinds of golf connections you're looking for in Edit Profile.",
  connectionInterestsTitle: "No connection interests added yet.",
  achievementsEmpty: "No achievements yet.",
  connectionsEmpty: "No connections yet.",
  favoriteCoursesEmpty: "No saved courses yet.",
  tripsEmpty: "No trips planned yet.",
  roundsEmpty: "No rounds shared yet.",
  notificationsEmpty: "Alerts appear when there is member activity to review.",
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
  futureFieldsNote: "Additional details will be available in a future update. Your experience saves with the fields above.",
} as const;

/** Messages — member correspondence copy */
export const messagesCopy = {
  eyebrow: "Member Messages",
  title: "Messages",
  lead: "Private correspondence with members — calm, direct, and golf-connected.",
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

/** Introductions — concierge connection workflow copy */
export const introductionsCopy = {
  eyebrow: "Member Introductions",
  title: "Introductions",
  lead: "Request thoughtful introductions to members you may want to know.",
  incoming: "Incoming",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined / Archived",
  loading: "Loading introduction requests…",
  loadErrorTitle: "Introduction requests unavailable",
  loadErrorCopy: "We could not load your introduction requests. Check your connection and try again.",
  retryLoad: "Try again",
  requestType: "Introduction type",
  messageLabel: "Your message",
  messagePrompt: "Explain why you would like to connect.",
  messagePlaceholder:
    "Share why you would like to connect — for example shared courses, travel plans, or business interests.",
  messageHint: "Write at least 20 characters so the member understands your request.",
  submitRequest: "Submit Introduction Request",
  submittingRequest: "Submitting request…",
  cancel: "Cancel",
  cancelRequest: "Cancel Request",
  accept: "Accept",
  decline: "Decline",
  messageMember: "Message Member",
  viewProfile: "View Profile",
  acceptSuccessTitle: "Introduction accepted",
  acceptSuccessCopy: (memberName: string) => `You can now message ${memberName} directly.`,
  openConversation: "OPEN CONVERSATION",
  acceptSuccess: "Introduction accepted. You can now message this member directly.",
  cancelSuccess: "Introduction request withdrawn.",
  emptyIncomingTitle: "No incoming requests",
  emptyIncomingCopy: "When a member requests an introduction to you, it will appear here.",
  emptySentTitle: "No sent requests",
  emptySentCopy: "Requests you send from Discover or member profiles will appear here.",
  emptyAcceptedTitle: "No accepted introductions yet",
  emptyAcceptedCopy: "Accepted introductions become direct Messages threads you can continue anytime.",
  emptyDeclinedTitle: "No declined or archived requests",
  emptyDeclinedCopy: "Declined and withdrawn requests remain here for your records.",
  emptyAllTitle: "No introduction requests yet",
  emptyAllCopy: "Request a private introduction from Discover or a member profile to begin.",
  modalEyebrow: "Private Introduction",
  modalTitle: "Request Introduction",
  modalLead:
    "Introductions give members a professional, discreet way to connect before messaging. Explain why you would like to connect.",
  submitSuccess: "Introduction request submitted. View it anytime in Introductions.",
} as const;

/** Ask EliteTee — private concierge copy */
export const askCopy = {
  eyebrow: "Private Concierge",
  title: "Ask EliteTee",
  lead: "Discover members, courses, and meaningful connections through EliteTee intelligence.",
  tagline: "Your private golf concierge.",
  suggestedLabel: "Suggested questions",
  composeLabel: "Your question",
  composePlaceholder: "Who should I meet in Florida?",
  submit: "Ask EliteTee",
  submitting: "Searching EliteTee…",
  loading: "Searching EliteTee…",
  answerEyebrow: "Concierge response",
  membersTitle: "Member recommendations",
  membersMeta: (count: number) => `${count} from EliteTee data`,
  coursesTitle: "Course recommendations",
  coursesMeta: (count: number) => `${count} from EliteTee data`,
  matchTitle: "Why these match",
  sourcesLabel: "Data sources",
  feedbackLabel: "Was this helpful?",
  feedbackThanks: "Thank you — your feedback improves Ask EliteTee.",
  errorTitle: "Something went wrong",
  retry: "Try again",
  insufficientNextSteps: [
    "Complete your profile with location, clubs, and interests.",
    "Share course experiences so Ask EliteTee can learn your taste.",
    "Broaden your question with a region, course, or interest.",
    "Explore members and courses manually while the directory grows.",
  ],
  insufficientNote:
    "Live external news and weather are not connected yet. Ask EliteTee uses member profiles, the course directory, and member review data only.",
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

export type FeedPostComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  displayTimestamp: string;
};

export type FeedMediaItem = {
  id: string;
  url: string;
  kind: "image" | "video";
  posterUrl?: string | null;
  mimeType?: string | null;
  caption?: string | null;
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
  /** Loaded when the comment panel is expanded */
  feedComments?: FeedPostComment[];
  /** Optional short badge (e.g. "Looking for Game"). Front-end only. */
  requestLabel?: string;
  /** Optional structured metadata rows (Destination, Dates, etc.). Front-end only. */
  details?: { label: string; value: string }[];
  /** Linked member course round — photos resolved from member_course_round_photos */
  memberCourseRoundId?: string;
  /** Active photos on the linked round (metadata count; list view may sign only the cover). */
  roundPhotoCount?: number;
  /** Linked golf course for community hero fallback */
  golfCourseId?: string;
  /** Rich media (images + videos) for feed rendering */
  mediaItems?: FeedMediaItem[];
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
