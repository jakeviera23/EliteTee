const previewCards = [
  {
    id: "feed",
    sectionId: "feed-preview",
    title: "Feed",
    description:
      "Share rounds, request introductions, find games while traveling, and follow where members are playing.",
    src: "/assets/homepage/feed.png",
    alt: "EliteTee Feed — member rounds, introductions, and activity",
    width: 1024,
    height: 682,
  },
  {
    id: "courses",
    title: "Courses",
    description:
      "Explore a curated course library through trusted member reviews, ratings, and firsthand experiences.",
    src: "/assets/homepage/courses.png",
    alt: "EliteTee Courses — curated course library and member experiences",
    width: 1024,
    height: 731,
  },
  {
    id: "discover",
    sectionId: "discover-preview",
    title: "Discover",
    description:
      "Find members by club, location, destination, interests, and travel plans.",
    src: "/assets/homepage/discover.png",
    alt: "EliteTee Discover — search members by club, location, and interests",
    width: 1024,
    height: 731,
  },
  {
    id: "messages",
    title: "Messages",
    description:
      "Continue private conversations around rounds, travel, introductions, and shared golf interests.",
    src: "/assets/homepage/messages.png",
    alt: "EliteTee Messages — private member conversations",
    width: 1024,
    height: 682,
  },
  {
    id: "introductions",
    title: "Introductions",
    description:
      "Request thoughtful introductions to members you may want to know through shared golf interests.",
    src: "/assets/homepage/introductions.png",
    alt: "EliteTee Introductions — member introduction requests",
    width: 1024,
    height: 819,
  },
];

export function PortalProductPreview() {
  return (
    <section
      id="feed-preview"
      className="section section--lined section--compact portal-product-preview"
      aria-labelledby="portal-preview-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <p className="section-eyebrow">Early community</p>
          <h2 id="portal-preview-heading">Inside EliteTee</h2>
          <p className="section-lead">
            A curated golf community for serious golfers to share rounds, discover courses, and
            build trusted relationships through the game.
          </p>
          <p className="section-note">
            A private golf network built around trusted experience, meaningful connections, and the
            game.
          </p>
        </header>

        <ul className="portal-product-preview-grid">
          {previewCards.map((card) => (
            <li key={card.id} id={card.sectionId}>
              <article className="portal-product-preview-card">
                <div className="portal-product-preview-media">
                  <img
                    src={card.src}
                    alt={card.alt}
                    width={card.width}
                    height={card.height}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
                  />
                  <span className="portal-product-preview-label">{card.title}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
