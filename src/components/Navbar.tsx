import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { navLinks } from "../data/content";

function scrollToSection(hash: string) {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ block: "start" });
    window.history.pushState(null, "", hash);
  }
}

function NavItem({
  href,
  label,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isHashLink = href.startsWith("#");

  if (isHashLink) {
    if (location.pathname === "/") {
      return (
        <a
          href={href}
          className={className}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(href);
            onNavigate?.();
          }}
        >
          {label}
        </a>
      );
    }

    return (
      <Link
        to={{ pathname: "/", hash: href }}
        className={className}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
  }

  const isRoute = href.startsWith("/");

  if (isRoute) {
    return (
      <Link to={href} className={className} onClick={onNavigate}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className} onClick={onNavigate}>
      {label}
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const showHeroNav = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`nav${scrolled || !isHome ? " is-scrolled" : ""}${showHeroNav ? " nav--hero" : ""}`}
      >
        <div className="layout nav-inner">
          <Link to="/" className="logo" aria-label="EliteTee home">
            <span className="logo-mark" aria-hidden="true" />
            <span className="logo-wordmark">EliteTee</span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {navLinks.map((l) => (
              <NavItem
                key={l.href}
                href={l.href}
                label={l.label}
                className={l.className}
              />
            ))}
          </nav>

          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="menu-icon" aria-hidden />
          </button>
        </div>
      </header>

      {open && (
        <nav className="mobile-menu" aria-label="Mobile">
          <button
            type="button"
            className="mobile-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          {navLinks.map((l) => (
            <NavItem
              key={l.href}
              href={l.href}
              label={l.label}
              className={l.className}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      )}
    </>
  );
}
