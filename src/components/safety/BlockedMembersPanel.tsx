import { useCallback, useEffect, useState } from "react";
import {
  listMyBlockedMembers,
  unblockMember,
  type BlockedMemberRow,
} from "../../lib/memberBlocks";

type BlockedMembersPanelProps = {
  onChanged?: () => void;
};

export function BlockedMembersPanel({ onChanged }: BlockedMembersPanelProps) {
  const [rows, setRows] = useState<BlockedMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listMyBlockedMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load blocked members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnblock(row: BlockedMemberRow) {
    setPendingId(row.blocked_user_id);
    setError(null);
    try {
      await unblockMember(row.blocked_user_id);
      setRows((current) => current.filter((item) => item.block_id !== row.block_id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unblock that member.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="et-blocked-members" aria-labelledby="blocked-members-heading">
      <header className="et-blocked-members-header">
        <h2 id="blocked-members-heading">Blocked Members</h2>
        <p>Members you block are hidden from your feed, comments, Discover, and messages.</p>
      </header>

      {loading ? <p>Loading blocked members…</p> : null}
      {error ? (
        <p className="et-safety-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="et-blocked-members-empty">You have not blocked anyone.</p>
      ) : null}

      <ul className="et-blocked-members-list">
        {rows.map((row) => (
          <li key={row.block_id} className="et-blocked-members-item">
            <div>
              <strong>{row.full_name?.trim() || "Member"}</strong>
              {row.primary_club ? <span>{row.primary_club}</span> : null}
              {row.based_in ? <span>{row.based_in}</span> : null}
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary"
              disabled={pendingId === row.blocked_user_id}
              onClick={() => void handleUnblock(row)}
            >
              {pendingId === row.blocked_user_id ? "Unblocking…" : "Unblock"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
