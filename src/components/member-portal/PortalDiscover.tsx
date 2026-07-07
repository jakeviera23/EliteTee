import { useMemo, useRef, useState } from "react";
import { photos } from "../../assets/photos";
import { FeedAvatar } from "./FeedAvatar";

type PortalDiscoverProps = {
  onViewCourse?: (courseId: string) => void;
  onNavigate?: (tab: "profile" | "messages") => void;
};

type DiscoverMember = {
  id: string;
  name: string;
  homeClub: string;
  location: string;
  interests: string[];
};

const discoverFilters = [
  "All Members",
  "Near Me",
  "Traveling Soon",
  "Same Home Club",
  "Business Golf",
  "Competitive Golf",
  "Course Architecture",
  "International Travel",
] as const;

// Interest-based chips narrow the member list; the contextual chips
// (Near Me, Traveling Soon, Same Home Club) select visually and keep the
// full list until real member context is available.
const filterKeywords: Record<string, string[]> = {
  "Business Golf": ["business"],
  "Competitive Golf": ["competitive"],
  "Course Architecture": ["architecture"],
  "International Travel": ["international", "travel"],
};

const suggestedMembers: DiscoverMember[] = [
  {
    id: "member-wexford",
    name: "James Wexford",
    homeClub: "Piping Rock Club",
    location: "New York",
    interests: ["Travel", "Business Golf"],
  },
  {
    id: "member-vance",
    name: "Charlotte Vance",
    homeClub: "Merion Golf Club",
    location: "Philadelphia",
    interests: ["Course Architecture", "Competitive Golf"],
  },
  {
    id: "member-holloway",
    name: "Marcus Holloway",
    homeClub: "Winged Foot Golf Club",
    location: "New York",
    interests: ["Private Clubs", "Travel"],
  },
  {
    id: "member-bennett",
    name: "Sofia Bennett",
    homeClub: "Kingston Heath Golf Club",
    location: "Melbourne",
    interests: ["Architecture", "International Golf"],
  },
];

const travelBoard = [
  { id: "trip-scotland", place: "Scotland", when: "July" },
  { id: "trip-hamptons", place: "Hamptons", when: "August" },
  { id: "trip-palm-beach", place: "Palm Beach", when: "Winter" },
  { id: "trip-london", place: "London Heathland", when: "September" },
];

const popularDestinations = [
  "Scotland",
  "Hamptons",
  "Palm Beach",
  "Monterey Peninsula",
  "London",
];

export function PortalDiscover({ onViewCourse: _onViewCourse, onNavigate }: PortalDiscoverProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Members");
  const membersRef = useRef<HTMLDivElement>(null);

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const keywords = filterKeywords[activeFilter];

    return suggestedMembers.filter((member) => {
      const haystack = [member.name, member.homeClub, member.location, ...member.interests]
        .join(" ")
        .toLowerCase();
      const matchesQuery = normalized === "" || haystack.includes(normalized);
      const matchesFilter =
        !keywords ||
        member.interests.some((interest) =>
          keywords.some((keyword) => interest.toLowerCase().includes(keyword)),
        );
      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilter]);

  function handleViewGolfers(place: string) {
    setQuery(place);
    setActiveFilter("All Members");
    membersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="portal-social-page portal-discover-page" aria-labelledby="discover-heading">
      <div className="portal-discover-hero" aria-hidden="true">
        <img
          src={photos.heroAerial}
          alt="Aerial view of sand bunkers on a private fairway"
          style={{ objectFit: "cover", objectPosition: "center", width: "100%", height: "100%" }}
          loading="lazy"
          decoding="async"
        />
      </div>

      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="discover-heading">Discover</h2>
        <p>
          Find golfers by club, location, travel plans, interests, and shared standards for the
          game.
        </p>
      </header>

      <div className="discover-layout">
        <div className="discover-main">
          <section className="discover-toolbar" aria-labelledby="find-golfers-heading">
            <h3 id="find-golfers-heading" className="discover-section-title">
              Find Golfers
            </h3>
            <label className="portal-search-label portal-search-label--social">
              <span className="visually-hidden">Search golfers</span>
              <input
                type="search"
                className="portal-search-input"
                placeholder="Search by name, club, city, destination, or interest…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="discover-filters" role="group" aria-label="Filter golfers">
              {discoverFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`discover-chip${activeFilter === filter ? " is-active" : ""}`}
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="suggested-members-heading" ref={membersRef}>
            <h3 id="suggested-members-heading" className="discover-section-title">
              Suggested Members
            </h3>
            {visibleMembers.length > 0 ? (
              <div className="discover-members-grid">
                {visibleMembers.map((member) => (
                  <article key={member.id} className="discover-member-card">
                    <div className="discover-member-head">
                      <FeedAvatar name={member.name} size="lg" />
                      <div className="discover-member-identity">
                        <p className="discover-member-name">{member.name}</p>
                        <p className="discover-member-club">{member.homeClub}</p>
                        <p className="discover-member-location">{member.location}</p>
                      </div>
                    </div>
                    <ul className="discover-tags" aria-label="Interests">
                      {member.interests.map((interest) => (
                        <li key={interest} className="discover-tag">
                          {interest}
                        </li>
                      ))}
                    </ul>
                    <div className="discover-member-actions">
                      <button
                        type="button"
                        className="portal-btn portal-btn--gold portal-btn--compact"
                        onClick={() => onNavigate?.("profile")}
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        className="portal-btn portal-btn--outline portal-btn--compact"
                        onClick={() => onNavigate?.("messages")}
                      >
                        Message
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="discover-no-match">
                No members match that search yet. Try a different name, club, city, or interest.
              </p>
            )}
          </section>
        </div>

        <aside className="discover-aside" aria-labelledby="travel-board-heading">
          <div className="discover-travel-board">
            <h3 id="travel-board-heading" className="discover-section-title">
              Travel Board
            </h3>
            <ul className="discover-travel-list">
              {travelBoard.map((trip) => (
                <li key={trip.id}>
                  <button
                    type="button"
                    className="discover-travel-item"
                    onClick={() => handleViewGolfers(trip.place)}
                  >
                    <span className="discover-travel-place">{trip.place}</span>
                    <span className="discover-travel-when">{trip.when}</span>
                    <span className="discover-travel-note">Members interested in playing</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="discover-destinations-section" aria-labelledby="popular-destinations-heading">
        <h3 id="popular-destinations-heading" className="discover-section-title">
          Popular Destinations
        </h3>
        <div className="discover-destinations-grid">
          {popularDestinations.map((destination) => (
            <article key={destination} className="discover-destination-card">
              <h4 className="discover-destination-name">{destination}</h4>
              <button
                type="button"
                className="portal-btn portal-btn--outline portal-btn--compact"
                onClick={() => handleViewGolfers(destination)}
              >
                View golfers
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
