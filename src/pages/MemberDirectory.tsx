import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  directoryMembers,
  getDirectoryIndustries,
  getDirectoryRegions,
} from "../data/memberDirectory";

const ALL = "All";

export function MemberDirectory() {
  const [industry, setIndustry] = useState(ALL);
  const [region, setRegion] = useState(ALL);

  const industries = useMemo(() => getDirectoryIndustries(directoryMembers), []);
  const regions = useMemo(() => getDirectoryRegions(directoryMembers), []);

  const filtered = useMemo(() => {
    return directoryMembers.filter((member) => {
      const industryMatch = industry === ALL || member.industry === industry;
      const regionMatch = region === ALL || member.region === region;
      return industryMatch && regionMatch;
    });
  }, [industry, region]);

  return (
    <>
      <header className="nav nav--directory is-scrolled">
        <div className="layout nav-inner">
          <Link to="/" className="logo">
            EliteTee
          </Link>
          <p className="directory-nav-label">Private directory</p>
        </div>
      </header>

      <main className="directory-page">
        <div className="layout">
          <header className="directory-header">
            <p className="directory-eyebrow">Members only</p>
            <h1 className="directory-title">Member directory</h1>
            <p className="directory-lead">
              Verified members of the society. This page is not listed publicly.
            </p>
          </header>

          <div className="directory-filters" role="search" aria-label="Filter members">
            <label className="directory-filter">
              <span>Industry</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Filter by industry"
              >
                <option value={ALL}>{ALL}</option>
                {industries.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="directory-filter">
              <span>Region</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label="Filter by region"
              >
                <option value={ALL}>{ALL}</option>
                {regions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <p className="directory-count" aria-live="polite">
              {filtered.length} member{filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          <ul className="directory-grid">
            {filtered.map((member) => (
              <li key={member.id}>
                <article className="directory-card">
                  <h2 className="directory-card-name">{member.name}</h2>
                  <dl className="directory-card-meta">
                    <div>
                      <dt>Club</dt>
                      <dd>{member.club}</dd>
                    </div>
                    <div>
                      <dt>City</dt>
                      <dd>{member.city}</dd>
                    </div>
                    <div>
                      <dt>Industry</dt>
                      <dd>{member.industry}</dd>
                    </div>
                  </dl>
                  <p className="directory-card-bio">{member.bio}</p>
                </article>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <p className="directory-empty">No members match these filters.</p>
          )}
        </div>
      </main>

      <footer className="footer directory-footer">
        <div className="layout footer-inner">
          <div className="footer-brand">
            <p className="footer-copy">© EliteTee</p>
            <p className="footer-tagline">Building trusted relationships through golf, business, and travel.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
