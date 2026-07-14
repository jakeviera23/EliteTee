import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function NotFound() {
  return (
    <>
      <Navbar />
      <main className="about-page">
        <section className="section section--compact about-section" aria-labelledby="not-found-heading">
          <div className="layout about-layout">
            <header className="about-header">
              <p className="section-eyebrow">404</p>
              <h1 id="not-found-heading">Page not found</h1>
            </header>
            <p className="section-note">
              This page is not part of EliteTee. Return to the homepage to continue exploring the
              network.
            </p>
            <Link to="/" className="btn-hero btn-hero--primary">
              Back to homepage
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
