import { useRef } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { getAvailablePortalCreateActions, PORTAL_CREATE_GROUP_LABELS, type PortalCreateAction, type PortalCreateActionGroup } from "../../lib/portalCreation";

type GlobalCreateMenuProps = { open: boolean; onClose: () => void; onSelect: (action: PortalCreateAction) => void };
const GROUPS: PortalCreateActionGroup[] = ["share", "connect"];

export function GlobalCreateMenu({ open, onClose, onSelect }: GlobalCreateMenuProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ active: open, dialogRef, initialFocusRef: closeButtonRef, onEscape: onClose });
  const availableActions = getAvailablePortalCreateActions();

  if (!open) return null;

  return (
    <div className="portal-create-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="portal-create-menu" role="dialog" aria-modal="true" aria-labelledby="portal-create-heading" onMouseDown={(event) => event.stopPropagation()}>
        <header className="portal-create-head">
          <div>
            <p className="portal-create-eyebrow">Create inside EliteTee</p>
            <h2 id="portal-create-heading">What would you like to share?</h2>
            <p>One considered contribution can start a round, a trip, or a lasting connection.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="portal-create-close" onClick={onClose} aria-label="Close create menu">×</button>
        </header>
        <div className="portal-create-groups">
          {GROUPS.map((group) => (
            <section key={group} className="portal-create-group" aria-label={PORTAL_CREATE_GROUP_LABELS[group]}>
              <p className="portal-create-group-label">{PORTAL_CREATE_GROUP_LABELS[group]}</p>
              <div className="portal-create-grid">
                {availableActions.filter((action) => action.group === group).map((action, index) => (
                  <button key={action.id} type="button" className="portal-create-option" onClick={() => onSelect(action)}>
                    <span className="portal-create-option-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="portal-create-option-copy"><strong>{action.label}</strong><span>{action.description}</span></span>
                    <span className="portal-create-option-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
