import { useEffect, useState } from "react";
import { navLinks } from "../data/content";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
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
        className={`nav${!scrolled ? " nav--overlay" : ""}${scrolled ? " is-scrolled" : ""}`}
      >
        <div className="layout nav-inner">
          <a href="#" className="logo">
            EliteTee
          </a>

          <nav className="nav-links" aria-label="Primary">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
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
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
