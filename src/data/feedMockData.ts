import type { FeedPost, PortalGolfer } from "./portalSocial";

/**
 * Mock feed data for Sprint 1 — local sample rounds only.
 * Shaped as `FeedPost[]` so it can be swapped for a Supabase query later
 * without changing the feed components.
 */

const base = import.meta.env.BASE_URL;

function asset(path: string) {
  return `${base}${path.replace(/^\//, "")}`;
}

const courseImage = {
  nationalGolfLinks: asset("images/courses/national-golf-links.png"),
  shinnecock: asset("images/courses/pebble-beach.jpg"),
  pineValley: asset("images/courses/bandon-dunes.jpg"),
  seminole: asset("images/courses/course-03.jpg"),
  cypressPoint: asset("images/courses/cabot-cliffs.png"),
  royalMelbourne: asset("images/courses/royal-county-down.png"),
  stAndrews: asset("images/courses/st-andrews.png"),
  cabotCliffs: asset("images/courses/pebble-beach.jpg"),
} as const;

type MockGolferInput = {
  id: string;
  name: string;
  homeCourse: string;
  location: string;
  isVerified?: boolean;
  handicap?: number;
};

function golfer(input: MockGolferInput): PortalGolfer {
  return {
    id: input.id,
    name: input.name,
    handle: input.name.toLowerCase().replace(/[^a-z]+/g, ""),
    location: input.location,
    homeCourse: input.homeCourse,
    handicap: input.handicap,
    bio: "",
    isVerified: Boolean(input.isVerified),
    followers: 0,
    following: 0,
    coursesPlayed: 0,
    roundsPosted: 0,
    countriesPlayed: 0,
    favoriteCourses: [],
  };
}

const golfers = {
  wexford: golfer({
    id: "golfer-wexford",
    name: "James Wexford",
    homeCourse: "Piping Rock Club",
    location: "Locust Valley, New York",
    isVerified: true,
    handicap: 4,
  }),
  vance: golfer({
    id: "golfer-vance",
    name: "Charlotte Vance",
    homeCourse: "Merion Golf Club",
    location: "Ardmore, Pennsylvania",
    isVerified: true,
    handicap: 6,
  }),
  marchetti: golfer({
    id: "golfer-marchetti",
    name: "Theo Marchetti",
    homeCourse: "Baltusrol Golf Club",
    location: "Springfield, New Jersey",
    handicap: 9,
  }),
  raman: golfer({
    id: "golfer-raman",
    name: "Priya Raman",
    homeCourse: "The Los Angeles Country Club",
    location: "Los Angeles, California",
    isVerified: true,
    handicap: 3,
  }),
  fraser: golfer({
    id: "golfer-fraser",
    name: "Duncan Fraser",
    homeCourse: "Muirfield",
    location: "Gullane, Scotland",
    isVerified: true,
    handicap: 2,
  }),
  bennett: golfer({
    id: "golfer-bennett",
    name: "Sofia Bennett",
    homeCourse: "Kingston Heath Golf Club",
    location: "Melbourne, Australia",
    handicap: 7,
  }),
  holloway: golfer({
    id: "golfer-holloway",
    name: "Marcus Holloway",
    homeCourse: "Winged Foot Golf Club",
    location: "Mamaroneck, New York",
    isVerified: true,
    handicap: 5,
  }),
  shaw: golfer({
    id: "golfer-shaw",
    name: "Eleanor Shaw",
    homeCourse: "Royal Dornoch Golf Club",
    location: "Dornoch, Scotland",
    isVerified: true,
    handicap: 8,
  }),
} as const;

export const mockFeedPosts: FeedPost[] = [
  {
    id: "mock-ngla",
    postType: "played-today",
    author: golfers.wexford,
    courseName: "National Golf Links of America",
    courseLocation: "Southampton, New York",
    images: [courseImage.nationalGolfLinks],
    imageAlt: "Windmill fairway at National Golf Links of America",
    caption:
      "Firm, fast, and blowing off the bay — NGLA at its finest. The Redan still humbles me every single time.",
    likes: 128,
    comments: 14,
    timestamp: "Today",
    roundType: "Casual Round",
    playedWith: "Marcus Holloway, Theo Marchetti",
    rating: 10,
    weather: "Sunny, 15mph off the bay",
    score: "76",
    commentPreview: { author: "Marcus Holloway", text: "That Redan tee shot was pure." },
  },
  {
    id: "mock-shinnecock",
    postType: "course-review",
    author: golfers.vance,
    courseName: "Shinnecock Hills Golf Club",
    courseLocation: "Southampton, New York",
    images: [courseImage.shinnecock],
    imageAlt: "Rolling links fairways at Shinnecock Hills",
    caption:
      "A proper test of ball-striking. Every green demands a decision. Left with more questions than answers — exactly why I love this place.",
    likes: 96,
    comments: 9,
    timestamp: "Yesterday",
    roundType: "Tournament",
    playedWith: "Priya Raman",
    rating: 9,
    weather: "Overcast, breezy",
    score: "81",
  },
  {
    id: "mock-pinevalley",
    postType: "bucket-list",
    author: golfers.marchetti,
    courseName: "Pine Valley Golf Club",
    courseLocation: "Pine Valley, New Jersey",
    images: [courseImage.pineValley],
    imageAlt: "Sandy waste areas and pines at Pine Valley",
    caption:
      "Finally checked off a lifelong bucket-list round. Harder and more beautiful than I ever imagined. Sandy scrub everywhere you don't want to be.",
    likes: 214,
    comments: 27,
    timestamp: "2 days ago",
    roundType: "Bucket List",
    rating: 10,
    weather: "Clear and calm",
    score: "88",
    commentPreview: { author: "Charlotte Vance", text: "Bucket list goals. Incredible." },
  },
  {
    id: "mock-seminole",
    postType: "golf-travel",
    author: golfers.raman,
    courseName: "Seminole Golf Club",
    courseLocation: "Juno Beach, Florida",
    images: [courseImage.seminole],
    imageAlt: "Coastal fairways at Seminole Golf Club",
    caption:
      "Ross routing perfection with the ocean breeze doing all the defending. Wind off the Atlantic turned a wedge into a 7-iron.",
    likes: 73,
    comments: 6,
    timestamp: "3 days ago",
    roundType: "Travel Round",
    playedWith: "Duncan Fraser",
    rating: 9,
    weather: "Warm, strong sea breeze",
    score: "79",
  },
  {
    id: "mock-cypress",
    postType: "played-today",
    author: golfers.fraser,
    courseName: "Cypress Point Club",
    courseLocation: "Pebble Beach, California",
    images: [courseImage.cypressPoint],
    imageAlt: "Cliffside par three above the Pacific at Cypress Point",
    caption:
      "The 16th is every bit the cathedral they promise. Took driver over the ocean and somehow found the green. A round I'll never forget.",
    likes: 301,
    comments: 41,
    timestamp: "4 days ago",
    roundType: "Casual Round",
    playedWith: "Eleanor Shaw",
    rating: 10,
    weather: "Cool, coastal fog lifting",
    score: "74",
    commentPreview: { author: "Priya Raman", text: "The 16th is unreal. So jealous." },
  },
  {
    id: "mock-royalmelbourne",
    postType: "golf-travel",
    author: golfers.bennett,
    courseName: "Royal Melbourne (West)",
    courseLocation: "Black Rock, Victoria, Australia",
    images: [courseImage.royalMelbourne],
    imageAlt: "Wide sandbelt fairways at Royal Melbourne",
    caption:
      "Sandbelt turf is a different sport — the ball runs forever. Best conditioned fairways I've ever walked. MacKenzie was a genius.",
    likes: 87,
    comments: 8,
    timestamp: "5 days ago",
    roundType: "Travel Round",
    rating: 9,
    weather: "Sunny, firm and fast",
    score: "83",
  },
  {
    id: "mock-standrews",
    postType: "bucket-list",
    author: golfers.holloway,
    courseName: "St Andrews (Old Course)",
    courseLocation: "St Andrews, Scotland",
    images: [courseImage.stAndrews],
    imageAlt: "The Swilcan Bridge and 18th at the Old Course",
    caption:
      "Walked the Swilcan Bridge at golden hour. Bogeyed 18 and didn't care one bit. The home of golf lives up to every word.",
    likes: 256,
    comments: 33,
    timestamp: "Last week",
    roundType: "Bucket List",
    playedWith: "Sofia Bennett, Duncan Fraser",
    rating: 10,
    weather: "Gusty, classic links sky",
    score: "80",
    commentPreview: { author: "Duncan Fraser", text: "Home turf. Glad you finally made it over." },
  },
  {
    id: "mock-cabot",
    postType: "course-review",
    author: golfers.shaw,
    courseName: "Cabot Cliffs",
    courseLocation: "Inverness, Nova Scotia",
    images: [courseImage.cabotCliffs],
    imageAlt: "Clifftop green above the Atlantic at Cabot Cliffs",
    caption:
      "Cliffside golf that makes your palms sweat in the best way. The par-3 16th over the ocean is worth the trip alone.",
    likes: 142,
    comments: 18,
    timestamp: "Last week",
    roundType: "Travel Round",
    playedWith: "James Wexford",
    rating: 9,
    weather: "Bright, brisk Atlantic wind",
    score: "82",
  },
];

/** Returns a fresh copy so callers can safely prepend user-created posts. */
export function getMockFeedPosts(): FeedPost[] {
  return mockFeedPosts.map((post) => ({ ...post }));
}
