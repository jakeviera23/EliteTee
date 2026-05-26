type Props = {
  image: string;
  alt: string;
  title: string;
  description?: string;
  id?: string;
  size?: "main" | "standard";
  align?: "left" | "center";
};

export function HeroBand({
  image,
  alt,
  title,
  description,
  id,
  size = "standard",
  align = "left",
}: Props) {
  return (
    <section
      id={id}
      className={`hero-band hero-band--${size} hero-band--${align}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <img className="hero-band-bg" src={image} alt={alt} loading="lazy" decoding="async" />
      <div className="hero-band-overlay hero-band-overlay--base" aria-hidden />
      <div className="hero-band-inner layout">
        <h2 id={id ? `${id}-title` : undefined} className="hero-band-title">
          {title}
        </h2>
        {description ? <p className="hero-band-desc">{description}</p> : null}
      </div>
    </section>
  );
}
