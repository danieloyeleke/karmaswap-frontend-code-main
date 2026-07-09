// UsersPanel.jsx → src/components/admin/UsersPanel.jsx
// Replaces the inline UsersPanel in AdminApp.jsx
// Props: role (string), onViewUser(userId, username)

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import api from "../../api/axios";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadgeClass(suspended) {
  return suspended ? "admin-badge badge--error" : "admin-badge badge--success";
}

// ── Suspend button (inline, needs reason) ────────────────────────────────────
import { AlertTriangle } from "lucide-react";

function SuspendBtn({ userId, suspended }) {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  if (suspended || done) return <span className="admin-badge badge--error">Suspended</span>;

  const doSuspend = () => {
    if (!reason) return;
    setLoading(true);
    api.post(`/admin/users/${userId}/suspend`, { reason })
      .then(() => setDone(true))
      .catch(() => alert("Suspend failed."))
      .finally(() => { setLoading(false); setConfirm(false); });
  };

  return (
    <>
      <button className="admin-danger-btn" onClick={() => setConfirm(true)} disabled={loading}>
        {loading ? "…" : "Suspend"}
      </button>
      {confirm && (
        <div className="admin-overlay">
          <div className="admin-dialog">
            <AlertTriangle size={28} className="admin-dialog__icon" />
            <p className="admin-dialog__message">Provide a reason for suspending this user.</p>
            <input
              className="admin-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="Reason (required)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="admin-dialog__actions">
              <button className="btn-secondary" onClick={() => { setConfirm(false); setReason(""); }}>Cancel</button>
              <button className="btn-primary" style={{ background: "var(--error)" }} onClick={doSuspend} disabled={!reason}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Users table tab ───────────────────────────────────────────────────────────
function UsersTable({ role, onViewUser }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("");
  const [page, setPage]       = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const SIZE = 20;
  const canAct = role === "SUPER_ADMIN" || role === "MODERATOR";

  const load = useCallback((p = 0) => {
    setLoading(true); setError(null);
    const params = { page: p, size: SIZE };
    if (search) params.search = search;
    if (filter) params.filter = filter;
    api.get("/admin/users", { params })
      .then(r => {
        const data = r.data ?? [];
        setRows(data);
        setHasMore(data.length === SIZE);
        setPage(p);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div>
      <div className="admin-filter-bar">
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} style={{ position: "absolute", left: 10, color: "var(--text-light)", pointerEvents: "none" }} />
          <input
            className="admin-input"
            style={{ paddingLeft: 30 }}
            placeholder="Search username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(0)}
          />
        </div>
        <select className="admin-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All users</option>
          <option value="TODAY">Joined today</option>
          <option value="THIS_WEEK">Joined this week</option>
          <option value="INACTIVE_7">Inactive 7 days</option>
          <option value="INACTIVE_30">Inactive 30 days</option>
        </select>
        <button className="btn-primary" onClick={() => load(0)}>Apply</button>
      </div>

      {error   && <p className="error-message">{error}</p>}
      {loading && <div className="admin-loading"><div className="loading-spinner" /></div>}

      {!loading && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th><th>Email</th><th>Location</th>
                  <th>Karma</th><th>Listings</th><th>Trades</th>
                  <th>Flags</th><th>Last Seen</th><th>Status</th>
                  {canAct && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={canAct ? 10 : 9} className="admin-empty-cell">No users found.</td></tr>
                )}
                {rows.map(u => (
                  <tr key={u.id}>
                    <td>
                      <button className="admin-link" onClick={() => onViewUser(u.id, u.username)}>
                        {u.username}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.location ?? "—"}</td>
                    <td>{u.karmaBalance}</td>
                    <td>{u.totalListings}</td>
                    <td>{u.completedTrades}</td>
                    <td>
                      {u.flagCount > 0
                        ? <span className="admin-badge badge--warn">{u.flagCount}</span>
                        : <span style={{ color: "var(--text-light)" }}>—</span>
                      }
                    </td>
                    <td className="admin-td-mono">{fmtDate(u.lastSeen)}</td>
                    <td><span className={statusBadgeClass(u.suspended)}>{u.suspended ? "Suspended" : "Active"}</span></td>
                    {canAct && <td><SuspendBtn userId={u.id} suspended={u.suspended} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button className="btn-tertiary" disabled={page === 0} onClick={() => load(page - 1)}>← Prev</button>
            <span>Page {page + 1}</span>
            <button className="btn-tertiary" disabled={!hasMore} onClick={() => load(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Registrations tab ─────────────────────────────────────────────────────────
function RegistrationsTable({ onViewUser }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const SIZE = 20;

  const load = useCallback((p = 0) => {
    setLoading(true); setError(null);
    api.get("/admin/users/registrations", { params: { page: p, size: SIZE } })
      .then(r => {
        const data = r.data ?? [];
        setRows(data);
        setHasMore(data.length === SIZE);
        setPage(p);
      })
      .catch(() => setError("Failed to load registrations."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  return (
    <div>
      {error   && <p className="error-message">{error}</p>}
      {loading && <div className="admin-loading"><div className="loading-spinner" /></div>}

      {!loading && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Username</th><th>Email</th><th>Location</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="admin-empty-cell">No registrations found.</td></tr>
                )}
                {rows.map(u => (
                  <tr key={u.id}>
                    <td>
                      <button className="admin-link" onClick={() => onViewUser(u.id, u.username)}>
                        {u.username}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.location ?? "—"}</td>
                    <td className="admin-td-mono">{fmtDate(u.joinDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button className="btn-tertiary" disabled={page === 0} onClick={() => load(page - 1)}>← Prev</button>
            <span>Page {page + 1}</span>
            <button className="btn-tertiary" disabled={!hasMore} onClick={() => load(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main UsersPanel with tabs ─────────────────────────────────────────────────
const TABS = [
  { id: "all",           label: "All Users" },
  { id: "registrations", label: "Registrations" },
];

export default function UsersPanel({ role, onViewUser }) {
  const [tab, setTab] = useState("all");

  return (
    <div>
      <h2 className="admin-page-title">Users</h2>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? "admin-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all"           && <UsersTable role={role} onViewUser={onViewUser} />}
      {tab === "registrations" && <RegistrationsTable onViewUser={onViewUser} />}
    </div>
  );
}
