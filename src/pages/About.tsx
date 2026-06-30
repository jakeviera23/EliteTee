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
                  EliteTee was created from years spent inside the golf world, where
                  relationships, introductions, and trust often matter as much as the round
                  itself.
                </p>
                <p>
                  The network exists to help ambitious golfers build meaningful connections
                  across golf, business, and travel while preserving the discretion, etiquette,
                  and hospitality that define a trusted private network.
                </p>
              </div>
            </section>

            <section className="about-block" aria-labelledby="why-heading">
              <h2 id="why-heading" className="about-block-title">
                Why EliteTee Exists
              </h2>
              <div className="about-prose prose">
                <p>
                  Great golf communities have always been built on relationships. EliteTee brings
                  that spirit into a carefully reviewed network where vetted members connect
                  through geography, travel, business interests, shared pursuits, and the game.
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
                      America&apos;s most respected golf clubs.
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
                </div>
              </div>
            </section>

            <Link to="/#apply" className="btn about-return">
              Return to Membership
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
