export function RouteLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-mark" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
