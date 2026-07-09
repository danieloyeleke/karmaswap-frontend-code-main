// FlagsPanel.jsx → src/components/admin/FlagsPanel.jsx
// Replaces the inline FlagsPanel in AdminApp.jsx
// Props: onViewUser(userId, username)

import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

const FLAG_TYPE_LABELS = {
  KARMA_FARMING:   "Karma Farming",
  LISTING_FLOOD:   "Listing Flood",
  INSTANT_CONFIRM: "Instant Confirm",
  CIRCULAR_SWAP:   "Circular Swap",
};

export default function FlagsPanel({ onViewUser }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [reviewed, setReviewed] = useState("false"); // "false" | "true" | "all"
  const [reviewing, setReviewing] = useState(null); // flag id being marked

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = reviewed !== "all" ? { reviewed } : {};
    api.get("/admin/flags", { params })
      .then(r => setRows(r.data ?? []))
      .catch(() => setError("Failed to load flags."))
      .finally(() => setLoading(false));
  }, [reviewed]);

  useEffect(() => { load(); }, [load]);

  const markReviewed = (flagId) => {
    setReviewing(flagId);
    api.patch(`/admin/flags/${flagId}/review`)
      .then(() => setRows(prev => prev.map(f => f.id === flagId ? { ...f, reviewed: true } : f)))
      .catch(() => alert("Failed to mark as reviewed."))
      .finally(() => setReviewing(null));
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-page-title">Fraud Flags</h2>
        <div className="admin-filter-bar" style={{ margin: 0 }}>
          <select className="admin-select" value={reviewed} onChange={e => setReviewed(e.target.value)}>
            <option value="false">Pending review</option>
            <option value="true">Reviewed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {error   && <p className="error-message">{error}</p>}
      {loading && <div className="admin-loading"><div className="loading-spinner" /></div>}

      {!loading && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Username</th><th>Flag Type</th><th>Description</th><th>Status</th><th>Flagged</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="admin-empty-cell">No flags found.</td></tr>
              )}
              {rows.map(f => (
                <tr key={f.id}>
                  <td>
                    <button className="admin-link" onClick={() => onViewUser(f.userId, f.username)}>
                      {f.username}
                    </button>
                  </td>
                  <td><span className="admin-badge badge--warn">{FLAG_TYPE_LABELS[f.flagType] ?? f.flagType}</span></td>
                  <td>{f.description}</td>
                  <td>
                    <span className={`admin-badge ${f.reviewed ? "badge--success" : "badge--error"}`}>
                      {f.reviewed ? "Reviewed" : "Pending"}
                    </span>
                  </td>
                  <td className="admin-td-mono">{fmtDate(f.createdAt)}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    {!f.reviewed && (
                      <button
                        className="btn-tertiary"
                        style={{ fontSize: 12 }}
                        disabled={reviewing === f.id}
                        onClick={() => markReviewed(f.id)}
                      >
                        {reviewing === f.id ? "…" : "Mark reviewed"}
                      </button>
                    )}
                    {/* SuspendBtn can be dropped in here from AdminApp if needed */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
