export function Footer() {
  return (
    <footer className="footer">
      <div className="layout footer-inner">
        <p className="footer-note">
          EliteTee is a private membership desk. We do not represent, endorse, or list
          any golf club by name in public materials unless agreed in writing with that
          institution.
        </p>
        <p className="footer-copy">© {new Date().getFullYear()} EliteTee</p>
      </div>
    </footer>
  );
}
