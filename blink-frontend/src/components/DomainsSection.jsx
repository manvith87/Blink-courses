export default function DomainsSection({ domains, onSelectDomain }) {
  if (domains.length === 0) return null;

  return (
    <section className="domains" id="domains">
      <div className="wrap">
        <div className="controls-head">
          <h2>Pick a domain</h2>
          <span id="resultCount">roadmaps, not just a list</span>
        </div>
        <p className="domains-sub">
          Pick where you want to end up — each one is an ordered path through courses already on the board.
        </p>

        <div className="domains-grid">
          {domains.map((domain) => (
            <button
              key={domain.slug}
              type="button"
              className="domain-card"
              onClick={() => onSelectDomain(domain.slug)}
            >
              <span className="domain-card-top">
                <span className="bulb"></span>
                <span className="domain-card-name">{domain.name}</span>
              </span>
              <span className="domain-card-desc">{domain.description}</span>
              <span className="domain-card-meta">
                {domain.stepCount} step{domain.stepCount === 1 ? "" : "s"} · {domain.courseCount} course
                {domain.courseCount === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
