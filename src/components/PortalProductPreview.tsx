import { insideEliteTeeLead } from "../data/content";

const featuredPreview = {
  src: "/assets/homepage/feed.png",
  alt: "EliteTee Feed — member rounds, introductions, and activity",
  width: 1024,
  height: 682,
};

const supportingPreviews = [
  {
    id: "discover",
    title: "Discover",
    src: "/assets/homepage/discover.png",
    alt: "EliteTee Discover — search members by club, location, and interests",
    width: 1024,
    height: 731,
  },
  {
    id: "courses",
    title: "Courses",
    src: "/assets/homepage/courses.png",
    alt: "EliteTee Courses — curated course library and member experiences",
    width: 1024,
    height: 731,
  },
  {
    id: "messages",
    title: "Messages",
    src: "/assets/homepage/messages.png",
    alt: "EliteTee Messages — private member conversations",
    width: 1024,
    height: 682,
  },
  {
    id: "introductions",
    title: "Introductions",
    src: "/assets/homepage/introductions.png",
    alt: "EliteTee Introductions — member introduction requests",
    width: 1024,
    height: 819,
  },
];

export function PortalProductPreview() {
  return (
    <section
      id="product"
      className="home-product-launch"
      aria-labelledby="portal-preview-heading"
    >
      <div className="home-product-launch-intro layout">
        <h2 id="portal-preview-heading" className="home-product-launch-title">
          Inside EliteTee
        </h2>
        <p className="home-product-launch-lead">{insideEliteTeeLead}</p>
      </div>

      <figure className="home-product-launch-featured">
        <img
          src={featuredPreview.src}
          alt={featuredPreview.alt}
          width={featuredPreview.width}
          height={featuredPreview.height}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sizes="(min-width: 1200px) 960px, 78vw"
        />
        <figcaption className="home-product-launch-caption">Home / Feed</figcaption>
      </figure>

      <div className="home-product-launch-grid layout">
        {supportingPreviews.map((preview) => (
          <figure key={preview.id} className="home-product-launch-item">
            <img
              src={preview.src}
              alt={preview.alt}
              width={preview.width}
              height={preview.height}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 900px) 480px, 92vw"
            />
            <figcaption className="home-product-launch-caption">{preview.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
