import { useEffect } from "react";

/** Tally form: https://tally.so/r/dWkObr */
const TALLY_EMBED_SRC =
  "https://tally.so/embed/dWkObr?hideTitle=1&transparentBackground=1&dynamicHeight=1";
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
    <section
      id="request"
      className="section section--request section--compact"
      aria-labelledby="request-heading"
    >
      <div className="layout request-layout">
        <header className="section-intro request-intro">
          <p className="request-desk-line">
            Applications are reviewed privately by the membership desk.
          </p>
          <h2 id="request-heading">Apply for membership</h2>
          <p className="section-lead request-lead">
            Founding membership is reviewed privately. Pricing and membership details are
            shared individually as the network develops.
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
            title="EliteTee membership application"
          />
        </div>
      </div>
    </section>
  );
}
