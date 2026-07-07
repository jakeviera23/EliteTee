import type { FeedPost, PortalGolfer } from "./portalSocial";
import { photos } from "../assets/photos";

/**
 * Mock feed data for Sprint 1 — local sample rounds only.
 * Shaped as `FeedPost[]` so it can be swapped for a Supabase query later
 * without changing the feed components.
 *
 * Images are imported from the shared photos map (src/assets/photos.ts) — the
 * exact same high-quality course assets the Courses page renders.
 */

const courseImage = {
  nationalGolfLinks: photos.courseNationalGolfLinks,
  wingedFoot: photos.courseWingedFoot,
  pineValley: photos.coursePineValley,
  seminole: photos.courseSeminole,
  cypressPoint: photos.courseCypressPoint,
  royalMelbourne: photos.courseRoyalMelbourne,
  stAndrews: photos.courseStAndrews,
  cabotCliffs: photos.courseCabotCliffs,
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
  // —— Round reviews (course images) ——
  {
    id: "mock-ngla",
    postType: "course-review",
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
    requestLabel: "Round Review",
    playedWith: "Marcus Holloway, Theo Marchetti",
    rating: 10,
    commentPreview: { author: "Marcus Holloway", text: "That Redan tee shot was pure." },
  },
  {
    id: "mock-wingedfoot",
    postType: "course-review",
    author: golfers.vance,
    courseName: "Winged Foot Golf Club",
    courseLocation: "Mamaroneck, New York",
    images: [courseImage.wingedFoot],
    imageAlt: "Clubhouse and finishing green at Winged Foot Golf Club",
    caption:
      "A proper test of ball-striking. Every green demands a decision. Left with more questions than answers — exactly why I love this place.",
    likes: 96,
    comments: 9,
    timestamp: "Yesterday",
    requestLabel: "Round Review",
    playedWith: "Priya Raman",
    rating: 9,
  },
  {
    id: "mock-pinevalley",
    postType: "course-review",
    author: golfers.marchetti,
    courseName: "Pine Valley Golf Club",
    courseLocation: "Pine Valley, New Jersey",
    images: [courseImage.pineValley],
    imageAlt: "Sandy waste areas and pines at Pine Valley",
    caption:
      "Finally checked off a lifelong round. Harder and more beautiful than I imagined — sandy scrub everywhere you don't want to be.",
    likes: 214,
    comments: 27,
    timestamp: "2 days ago",
    requestLabel: "Round Review",
    rating: 10,
    commentPreview: { author: "Charlotte Vance", text: "Bucket list goals. Incredible." },
  },
  {
    id: "mock-seminole",
    postType: "course-review",
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
    requestLabel: "Round Review",
    playedWith: "Duncan Fraser",
    rating: 9,
  },
  {
    id: "mock-cypress",
    postType: "course-review",
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
    requestLabel: "Round Review",
    playedWith: "Eleanor Shaw",
    rating: 10,
    commentPreview: { author: "Priya Raman", text: "The 16th is unreal. So jealous." },
  },
  {
    id: "mock-standrews",
    postType: "course-review",
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
    requestLabel: "Round Review",
    playedWith: "Sofia Bennett, Duncan Fraser",
    rating: 10,
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
    requestLabel: "Round Review",
    playedWith: "James Wexford",
    rating: 9,
  },

  // —— Travel / requests / discussion (clean text cards) ——
  {
    id: "mock-travel-scotland",
    postType: "golf-travel",
    author: golfers.fraser,
    courseName: "Scotland",
    courseLocation: "September trip",
    images: [],
    imageAlt: "",
    caption:
      "Heading home for a links swing in September and looking to play St Andrews, North Berwick, or Kingsbarns. Would love to connect with members making the trip — happy to help with tee times.",
    likes: 41,
    comments: 7,
    timestamp: "Today",
    requestLabel: "Traveling",
    details: [
      { label: "Destination", value: "East Lothian & Fife, Scotland" },
      { label: "Dates", value: "Sept 8–15" },
      { label: "Courses", value: "St Andrews, North Berwick, Kingsbarns" },
    ],
    commentPreview: { author: "Marcus Holloway", text: "In for North Berwick if timing works." },
  },
  {
    id: "mock-lfg-palmbeach",
    postType: "played-today",
    author: golfers.raman,
    courseName: "Palm Beach",
    courseLocation: "Florida",
    images: [],
    imageAlt: "",
    caption:
      "Looking for a game in Palm Beach this winter. Flexible on weekdays and happy to travel to your club. Low single-digit, quick pace, good company.",
    likes: 28,
    comments: 5,
    timestamp: "Yesterday",
    requestLabel: "Looking for Game",
    details: [
      { label: "Club/Course", value: "Palm Beach area" },
      { label: "Dates", value: "This winter — weekdays" },
      { label: "Looking for", value: "1–3 players / a host" },
    ],
  },
  {
    id: "mock-intro-friars",
    postType: "played-today",
    author: golfers.marchetti,
    courseName: "Friar's Head",
    courseLocation: "Baiting Hollow, New York",
    images: [],
    imageAlt: "",
    caption:
      "Hoping for an introduction at Friar's Head this summer. It's the one Long Island course still on my list. Any member open to hosting — I'd be grateful and reciprocate anytime.",
    likes: 63,
    comments: 11,
    timestamp: "2 days ago",
    requestLabel: "Introduction",
    details: [
      { label: "Club/Course", value: "Friar's Head" },
      { label: "Looking for", value: "A member host" },
    ],
    commentPreview: { author: "James Wexford", text: "I may be able to help — sending a note." },
  },
  {
    id: "mock-business-nyc",
    postType: "played-today",
    author: golfers.wexford,
    courseName: "New York City",
    courseLocation: "Business golf",
    images: [],
    imageAlt: "",
    caption:
      "In NYC next week and open to meeting founders or investors over a round. Happy to host at a metro-area club or join yours. Best conversations always seem to happen between shots.",
    likes: 52,
    comments: 9,
    timestamp: "2 days ago",
    requestLabel: "Business Golf",
    details: [
      { label: "City", value: "New York, NY" },
      { label: "Availability", value: "Next week" },
      { label: "Industry", value: "Founders & investors" },
    ],
  },
  {
    id: "mock-travel-hamptons",
    postType: "golf-travel",
    author: golfers.holloway,
    courseName: "The Hamptons",
    courseLocation: "New York",
    images: [],
    imageAlt: "",
    caption:
      "Heading to the Hamptons in August and looking for serious golfers for a few competitive rounds. Handicap under 8 preferred, but good company matters more than scores.",
    likes: 37,
    comments: 6,
    timestamp: "3 days ago",
    requestLabel: "Traveling",
    details: [
      { label: "Destination", value: "The Hamptons, NY" },
      { label: "Dates", value: "August" },
      { label: "Looking for", value: "Serious golfers (sub-8)" },
    ],
  },
  {
    id: "mock-discussion-architecture",
    postType: "played-today",
    author: golfers.bennett,
    courseName: "Course architecture",
    courseLocation: "",
    images: [],
    imageAlt: "",
    caption:
      "Would love to connect with members who care about course architecture — MacKenzie, Ross, Colt, and the modern minimalists. What's a green complex you think about long after the round?",
    likes: 44,
    comments: 15,
    timestamp: "4 days ago",
    requestLabel: "Discussion",
    commentPreview: { author: "Eleanor Shaw", text: "The 3rd at Royal County Down. Endlessly." },
  },
  {
    id: "mock-travel-monterey",
    postType: "golf-travel",
    author: golfers.shaw,
    courseName: "Monterey Peninsula",
    courseLocation: "California",
    images: [],
    imageAlt: "",
    caption:
      "Planning a Monterey Peninsula trip in October and mapping out the week. Looking for advice on pacing Pebble, Spyglass, and MPCC — and anyone who'll be in the area.",
    likes: 31,
    comments: 8,
    timestamp: "5 days ago",
    requestLabel: "Traveling",
    details: [
      { label: "Destination", value: "Monterey Peninsula, CA" },
      { label: "Dates", value: "October" },
      { label: "Courses", value: "Pebble Beach, Spyglass, MPCC" },
    ],
  },
  {
    id: "mock-intro-fishers",
    postType: "played-today",
    author: golfers.vance,
    courseName: "Fishers Island",
    courseLocation: "New York",
    images: [],
    imageAlt: "",
    caption:
      "Looking for an introduction to a member at Fishers Island. Traveling through New England late summer and would build the whole trip around it. Reciprocation offered anywhere I have access.",
    likes: 58,
    comments: 10,
    timestamp: "Last week",
    requestLabel: "Introduction",
    details: [
      { label: "Club/Course", value: "Fishers Island Club" },
      { label: "Looking for", value: "A member host" },
    ],
  },
  {
    id: "mock-discussion-heathland",
    postType: "played-today",
    author: golfers.holloway,
    courseName: "London heathland",
    courseLocation: "England",
    images: [],
    imageAlt: "",
    caption:
      "First trip to the London heathland belt this fall. Sunningdale, Swinley, St George's Hill, The Berkshire — how would you rank a three-day itinerary? All recommendations welcome.",
    likes: 39,
    comments: 12,
    timestamp: "Last week",
    requestLabel: "Discussion",
    details: [{ label: "Looking for", value: "Itinerary recommendations" }],
  },
];

/** Returns a fresh copy so callers can safely prepend user-created posts. */
export function getMockFeedPosts(): FeedPost[] {
  return mockFeedPosts.map((post) => ({ ...post }));
}
