import { useEffect } from "react";

const TALLY_EMBED_SRC =
  "https://tally.so/embed/dWkObr?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
const TALLY_WIDGET_SCRIPT = "https://tally.so/widgets/embed.js";

function loadTallyEmbeds() {
  if (typeof window.Tally !== "undefined") {
    window.Tally.loadEmbeds();
    return;
  }

  document
    .querySelectorAll<HTMLIFrameElement>('iframe[data-tally-src]:not([src])')
    .forEach((iframe) => {
      iframe.src = iframe.dataset.tallySrc ?? "";
    });
}

export function RequestIntroduction() {
  useEffect(() => {
    loadTallyEmbeds();

    if (document.querySelector(`script[src="${TALLY_WIDGET_SCRIPT}"]`) !== null) {
      return;
    }

    const script = document.createElement("script");
    script.src = TALLY_WIDGET_SCRIPT;
    script.onload = loadTallyEmbeds;
    script.onerror = loadTallyEmbeds;
    document.body.appendChild(script);
  }, []);

  return (
    <section id="request" className="section section--request" aria-labelledby="request-heading">
      <div className="layout">
        <header className="section-intro">
          <h2 id="request-heading">Request an introduction</h2>
          <p className="section-lead">
            Write to the membership desk with your name, home club, and the region or
            member you hope to meet. Replies are typically within two business days.
          </p>
        </header>

        <div className="request-panel">
          <iframe
            className="request-tally-embed"
            data-tally-src={TALLY_EMBED_SRC}
            loading="lazy"
            width="100%"
            height="1730"
            frameBorder={0}
            marginHeight={0}
            marginWidth={0}
            title="EliteTee Membership Request"
          />
        </div>
      </div>
    </section>
  );
}
