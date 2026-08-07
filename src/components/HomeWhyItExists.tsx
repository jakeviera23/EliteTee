import { photos } from "../assets/photos";
import { homeWhyItExists } from "../data/homePage";

export function HomeWhyItExists() {
  return (
    <section className="home-section home-why" aria-labelledby="home-why-heading">
      <div className="layout home-why-layout">
        <div className="home-why-copy">
          <h2 id="home-why-heading">{homeWhyItExists.title}</h2>
          <p className="home-why-body">{homeWhyItExists.body}</p>
          <p className="home-why-supporting">{homeWhyItExists.supporting}</p>
        </div>
        <figure className="home-why-media">
          <img
            src={photos.teeCloseupLuxury}
            alt="Golf ball on a tee at sunrise"
            loading="lazy"
            decoding="async"
            width={800}
            height={600}
          />
        </figure>
      </div>
    </section>
  );
}
