import { photos } from "../assets/photos";

export const MAX_RATING = 10;

export const ratingOptions = Array.from({ length: MAX_RATING }, (_, index) => MAX_RATING - index);

export const earlyStageCopy = {
  earlyCommunity: "Early community",
  memberActivityPending: "Member activity will appear here as golfers join.",
  beAmongFirst: "Be among the first golfers to share a round.",
  noPublicDirectory: "No public member directory until the community is active.",
  coursesGrowNote: "Courses will grow through member-posted rounds and recommendations.",
  feedEmpty:
    "Your feed will come alive as members begin sharing rounds, courses, and golf travel.",
  discoverGolfersEmpty: "Suggested members will appear here after approved golfers join.",
  popularDestinationsEmpty: "Popular destinations will grow from real member activity.",
  messagesEmpty: "Messages will appear once you connect with other members.",
  featuredCourseLabel: "Featured course example",
  courseDiscoveryPreview: "Course discovery preview",
  courseMemberPhotosNote: "Member photos will appear as rounds are shared.",
  profileStatsNote: "Stats update as you share rounds and connect with members.",
  achievementsEmpty: "Achievements will appear as you participate in the community.",
  connectionsEmpty: "Connections will appear as you follow and play with other members.",
  notificationsEmpty: "Alerts will appear as member activity grows.",
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
      "A historic American links with bold landforms, wind, and a timeless sense of place.",
    bestMonths: "May – October",
    image: photos.courseNationalGolfLinks,
    imageAlt: "National Golf Links of America windmill fairway",
    nearbyCourseIds: ["course-pebble"],
  },
  {
    id: "course-pebble",
    name: "Pebble Beach Golf Links",
    location: "Pebble Beach, California",
    description:
      "Iconic coastal golf where every hole sits above the Pacific — a benchmark for seaside design.",
    bestMonths: "April – October",
    image: photos.coursePebbleBeach,
    imageAlt: "Pebble Beach Golf Links",
    nearbyCourseIds: ["course-bandon"],
  },
  {
    id: "course-bandon",
    name: "Bandon Dunes",
    location: "Bandon, Oregon",
    description:
      "A pilgrimage destination for walking golf, Pacific views, and multi-course adventures.",
    bestMonths: "June – September",
    image: photos.courseBandonDunes,
    imageAlt: "Bandon Dunes",
    nearbyCourseIds: ["course-pebble", "course-cabot"],
  },
  {
    id: "course-standrews",
    name: "St Andrews Links",
    location: "St Andrews, Scotland",
    description:
      "The home of golf — a links tapestry defined by history, firm turf, and endless angles.",
    bestMonths: "May – September",
    image: photos.courseStAndrews,
    imageAlt: "St Andrews Links",
    nearbyCourseIds: ["course-rcd"],
  },
  {
    id: "course-cabot",
    name: "Cabot Cliffs",
    location: "Inverness, Nova Scotia",
    description:
      "Dramatic cliffside golf on the Atlantic — among the most striking walks in modern golf.",
    bestMonths: "July – September",
    image: photos.courseCabotCliffs,
    imageAlt: "Cabot Cliffs",
    nearbyCourseIds: ["course-bandon", "course-rcd"],
  },
  {
    id: "course-rcd",
    name: "Royal County Down",
    location: "Newcastle, Northern Ireland",
    description:
      "Mountains, dunes, and one of the world's great walking tests along the Irish Sea.",
    bestMonths: "June – August",
    image: photos.courseRoyalCountyDown,
    imageAlt: "Royal County Down",
    nearbyCourseIds: ["course-standrews"],
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
