// EscrowPanel.jsx → src/components/admin/EscrowPanel.jsx
// Replaces the inline EscrowPanel in AdminApp.jsx
// Props: role (string)

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import api from "../../api/axios";

function flagClass(flag) {
  if (flag === "RED")   return "admin-badge badge--error";
  if (flag === "AMBER") return "admin-badge badge--warn";
  return "admin-badge badge--success";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function fmtCountdown(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function DelistBtn({ escrowId, role }) {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  if (done) return <span className="admin-badge badge--error">Delisted</span>;

  const doDelist = () => {
    if (!reason) return;
    setLoading(true);
    api.post(`/admin/listings/${escrowId}/delist`, { reason })
      .then(() => setDone(true))
      .catch(() => alert("Delist failed."))
      .finally(() => { setLoading(false); setConfirm(false); });
  };

  return (
    <>
      <button className="admin-danger-btn" onClick={() => setConfirm(true)} disabled={loading}>
        {loading ? "…" : "Delist"}
      </button>
      {confirm && (
        <div className="admin-overlay">
          <div className="admin-dialog">
            <p className="admin-dialog__message">Provide a reason for delisting.</p>
            <input
              className="admin-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="Reason (required)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="admin-dialog__actions">
              <button className="btn-secondary" onClick={() => { setConfirm(false); setReason(""); }}>Cancel</button>
              <button className="btn-primary" style={{ background: "var(--error)" }} onClick={doDelist} disabled={!reason}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function EscrowPanel({ role }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const canAct = role === "SUPER_ADMIN" || role === "MODERATOR";

  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get("/admin/escrows")
      .then(r => setRows(r.data ?? []))
      .catch(() => setError("Failed to load escrows."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="admin-loading"><div className="loading-spinner" /></div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-page-title">Escrow Monitor</h2>
        <button className="btn-tertiary admin-refresh-btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Flag</th>
              <th>Seller</th>
              <th>Buyer</th>
              <th>Karma Locked</th>
              <th>Status</th>
              <th>Hours in Escrow</th>
              <th>Auto-confirm in</th>
              <th>Created</th>
              {canAct && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={canAct ? 9 : 8} className="admin-empty-cell">No active escrows.</td></tr>
            )}
            {rows.map(e => (
              <tr key={e.escrowId}>
                <td><span className={flagClass(e.flag)}>{e.flag}</span></td>
                <td>{e.sellerUsername} <span className="admin-karma-sub">({e.sellerKarmaBalance} karma)</span></td>
                <td>{e.buyerUsername} <span className="admin-karma-sub">({e.buyerKarmaBalance} karma)</span></td>
                <td>{e.karmaLocked}</td>
                <td>{e.status}</td>
                <td style={{ color: e.flag === "RED" ? "var(--error)" : e.flag === "AMBER" ? "#f57c00" : "inherit" }}>
                  {e.hoursInEscrow}h
                </td>
                <td>{fmtCountdown(e.autoConfirmRemainingSeconds)}</td>
                <td className="admin-td-mono">{fmtDate(e.createdAt)}</td>
                {canAct && (
                  <td><DelistBtn escrowId={e.escrowId} role={role} /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
