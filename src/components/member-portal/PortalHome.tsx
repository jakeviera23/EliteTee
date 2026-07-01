import { FormEvent } from "react";
import { homeOpportunities, homeStats } from "../../data/memberPortalDirectory";

type PortalHomeProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  onViewOpportunity: () => void;
};

export function PortalHome({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onViewOpportunity,
}: PortalHomeProps) {
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <div className="portal-home">
      <section className="portal-home-welcome" aria-labelledby="home-welcome-heading">
        <h1 id="home-welcome-heading">Access Private Golf Worldwide</h1>
        <p>
          Access reciprocal club opportunities, trusted member introductions, and private business
          relationships through EliteTee.
        </p>
      </section>

      <section className="portal-home-search" aria-label="Search the member network">
        <form onSubmit={handleSearchSubmit}>
          <label className="portal-search-label">
            <span className="visually-hidden">Search members, clubs, destinations, industries</span>
            <input
              type="search"
              className="portal-search-input portal-search-input--hero"
              placeholder="Search members, clubs, destinations, industries..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        </form>
      </section>

      <section className="portal-home-stats" aria-label="Network overview">
        <ul className="portal-stats portal-stats--home">
          {homeStats.map((stat) => (
            <li key={stat.label}>
              <article className="portal-stat-card">
                <span className="portal-stat-value">{stat.value}</span>
                <span className="portal-stat-label">{stat.label}</span>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="portal-home-opportunities" aria-labelledby="home-opportunities-heading">
        <h2 id="home-opportunities-heading">Recent Member Opportunities</h2>
        <ul className="portal-home-opportunities-list">
          {homeOpportunities.map((opportunity) => (
            <li key={opportunity.id}>
              <article className="portal-home-opportunity-card">
                <p className="portal-home-opportunity-category">{opportunity.category}</p>
                <p className="portal-home-opportunity-text">{opportunity.text}</p>
                <button
                  type="button"
                  className="portal-btn portal-btn--outline portal-home-opportunity-btn"
                  onClick={onViewOpportunity}
                >
                  View Opportunity
                </button>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
