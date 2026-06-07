import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { photos } from "../assets/photos";
import { founderClubExperience } from "../data/content";

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
                  EliteTee was created from years spent inside the private golf world, where
                  relationships, introductions, and trust often matter as much as the round
                  itself.
                </p>
                <p>
                  The society exists to help accomplished club members build meaningful
                  connections beyond their home club while preserving the discretion, etiquette,
                  and hospitality that define private club life.
                </p>
              </div>
            </section>

            <section className="about-block" aria-labelledby="why-heading">
              <h2 id="why-heading" className="about-block-title">
                Why EliteTee Exists
              </h2>
              <div className="about-prose prose">
                <p>
                  Private clubs have always been built on relationships. EliteTee brings that
                  same spirit into a broader, carefully reviewed network where verified members
                  may connect through geography, travel, business interests, club affiliation,
                  and shared pursuits.
                </p>
                <p>
                  EliteTee does not sell access, broker tee times, or operate as a public
                  directory. It exists to facilitate thoughtful introductions among members who
                  value trust, reciprocity, and long-term connection.
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
                      America&apos;s most respected private golf clubs.
                    </p>
                    <p>
                      His experience includes McArthur Golf Club, Shinnecock Hills Golf Club,
                      National Golf Links of America, Sebonack Golf Club, La Gorce Country Club,
                      Calusa Pines Golf Club, Westhampton Beach Country Club, and other private
                      golf communities throughout New York and Florida.
                    </p>
                    <p>
                      Through those years, Jake saw firsthand that the greatest value golf creates
                      is often not the round itself, but the trusted relationships, introductions,
                      friendships, and opportunities formed around it.
                    </p>
                  </div>

                  <div className="about-clubs" aria-labelledby="founder-clubs-heading">
                    <h3 id="founder-clubs-heading" className="about-clubs-title">
                      Selected Club Experience
                    </h3>
                    <ul className="about-clubs-list">
                      {founderClubExperience.map((club) => (
                        <li key={club}>{club}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <Link to="/#request" className="btn about-return">
              Return to Membership
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
