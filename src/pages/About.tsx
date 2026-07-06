import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { photos } from "../assets/photos";

export function About() {
  return (
    <>
      <Navbar />
      <main className="about-page">
        <section className="section section--compact about-section" aria-labelledby="about-heading">
          <div className="layout about-layout">
            <header className="about-header">
              <h1 id="about-heading">About EliteTee</h1>
            </header>

            <section className="about-block" aria-labelledby="our-story-heading">
              <h2 id="our-story-heading" className="about-block-title">
                Our Story
              </h2>
              <div className="about-prose prose">
                <p>
                  EliteTee was created for serious golfers who want more than a general-purpose
                  feed — a curated community to share rounds, discover great courses, and build
                  trusted relationships through the game.
                </p>
                <p>
                  We are not trying to be the biggest golf community. We are trying to be the
                  highest-quality one — thoughtful membership, optional verification, and a
                  premium experience built around golf.
                </p>
              </div>
            </section>

            <section className="about-block" aria-labelledby="why-heading">
              <h2 id="why-heading" className="about-block-title">
                Why EliteTee Exists
              </h2>
              <div className="about-prose prose">
                <p>
                  Great golf communities have always been built on shared experiences and trust.
                  EliteTee brings that spirit into a curated network where serious golfers share
                  rounds, explore courses through real stories, and build meaningful relationships
                  — with optional verification when members want added trust.
                </p>
              </div>
            </section>

            <section className="about-block about-founder" aria-labelledby="founder-heading">
              <h2 id="founder-heading" className="about-block-title">
                Founder
              </h2>

              <div className="about-founder-layout">
                <figure className="about-founder-photo">
                  <img
                    src={photos.founderPortrait}
                    alt="Jake Viera, founder of EliteTee"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>

                <div className="about-founder-content">
                  <div className="about-prose prose">
                    <p>
                      Jake Viera founded EliteTee after more than a decade spent inside some of
                      America&apos;s most respected golf communities.
                    </p>
                    <p>
                      His experience includes McArthur Golf Club, Shinnecock Hills Golf Club,
                      National Golf Links of America, Sebonack Golf Club, La Gorce Country Club,
                      Calusa Pines Golf Club, Westhampton Beach Country Club, and other renowned
                      courses throughout New York and Florida.
                    </p>
                    <p>
                      Through those years, Jake saw that the greatest value golf creates is often
                      the rounds shared, friendships formed, and trusted relationships built around
                      the game — the inspiration behind EliteTee.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Link to="/#apply" className="btn about-return">
              Request Membership
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
