import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  LayoutDashboard,
  Coins,
  Activity,
  Users,
  ArrowLeftRight,
  ShieldAlert,
  UserCog,
  LogOut,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  Scale,
} from "lucide-react";
import "../styles/Admin.css";
import KarmaEconomyPanel from "./admin/KarmaEconomyPanel";
import EscrowPanel from "./admin/EscrowPanel";
import FlagsPanel from "./admin/FlagsPanel";
import UsersPanel from "./admin/UsersPanel";
import DisputesPanel from "./admin/DisputesPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MODERATOR: "MODERATOR",
  OBSERVER: "OBSERVER",
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, minRole: null },
  { id: "activity", label: "Activity Log", icon: Activity, minRole: null },
  { id: "users", label: "Users", icon: Users, minRole: null },
  {
    id: "karma",
    label: "Karma Economy",
    icon: Coins,
    minRole: ROLES.SUPER_ADMIN,
  },
  {
    id: "escrow",
    label: "Escrow Monitor",
    icon: ArrowLeftRight,
    minRole: null,
  },
  {
    id: "flags",
    label: "Fraud Flags",
    icon: ShieldAlert,
    minRole: null,
    hideFor: ROLES.OBSERVER,
  },
  {
    id: "adminmgmt",
    label: "Admin Management",
    icon: UserCog,
    minRole: ROLES.SUPER_ADMIN,
  },
  {
    id: "disputes",
    label: "Disputes",
    icon: Scale,
    minRole: null,
    hideFor: ROLES.OBSERVER,
  },
];

const CAN_ACT = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.MODERATOR;

// ─── Mock data (clearly marked) ───────────────────────────────────────────────

const MOCK_USERS = [
  {
    id: "u1",
    username: "alice",
    email: "alice@ex.com",
    karmaBalance: 340,
    totalListings: 12,
    completedTrades: 8,
    status: "ACTIVE",
    joinDate: "2025-11-01",
  },
  {
    id: "u2",
    username: "bob",
    email: "bob@ex.com",
    karmaBalance: 120,
    totalListings: 4,
    completedTrades: 2,
    status: "ACTIVE",
    joinDate: "2025-12-15",
  },
  {
    id: "u3",
    username: "charlie",
    email: "charlie@ex.com",
    karmaBalance: 0,
    totalListings: 1,
    completedTrades: 0,
    status: "SUSPENDED",
    joinDate: "2026-01-03",
  },
  {
    id: "u4",
    username: "dana",
    email: "dana@ex.com",
    karmaBalance: 890,
    totalListings: 31,
    completedTrades: 27,
    status: "ACTIVE",
    joinDate: "2025-09-20",
  },
];

const MOCK_ESCROWS = [
  {
    id: "e1",
    listingTitle: "Vintage Camera",
    buyer: "alice",
    seller: "dana",
    amount: 120,
    status: "PENDING",
    createdAt: "2026-05-23T08:14:00Z",
  },
  {
    id: "e2",
    listingTitle: "Acoustic Guitar",
    buyer: "bob",
    seller: "alice",
    amount: 200,
    status: "COMPLETED",
    createdAt: "2026-05-22T16:45:00Z",
  },
  {
    id: "e3",
    listingTitle: "Mechanical Keyboard",
    buyer: "dana",
    seller: "bob",
    amount: 85,
    status: "DISPUTED",
    createdAt: "2026-05-21T11:00:00Z",
  },
];

const MOCK_FLAGS = [
  {
    id: "f1",
    userId: "u3",
    username: "charlie",
    reason: "Repeated no-show on confirmed swaps",
    severity: "HIGH",
    createdAt: "2026-05-22T09:00:00Z",
  },
  {
    id: "f2",
    userId: "u2",
    username: "bob",
    reason: "Suspected karma farming via alt accounts",
    severity: "MEDIUM",
    createdAt: "2026-05-20T14:30:00Z",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeClass(role) {
  if (role === ROLES.SUPER_ADMIN) return "admin-badge admin-badge--super";
  if (role === ROLES.MODERATOR) return "admin-badge admin-badge--mod";
  return "admin-badge admin-badge--observer";
}

function statusBadgeClass(status) {
  const map = {
    ACTIVE: "badge--success",
    SUSPENDED: "badge--error",
    PENDING: "badge--warn",
    COMPLETED: "badge--success",
    DISPUTED: "badge--error",
  };
  return `admin-badge ${map[status] || "badge--neutral"}`;
}

function severityClass(s) {
  return s === "HIGH"
    ? "admin-badge badge--error"
    : s === "MEDIUM"
      ? "admin-badge badge--warn"
      : "admin-badge badge--neutral";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function canSeeSection(id, role) {
  const item = NAV_ITEMS.find((n) => n.id === id);
  if (!item) return false;
  if (item.minRole === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN)
    return false;
  if (item.hideFor === role) return false;
  return true;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="admin-overlay">
      <div className="admin-dialog">
        <AlertTriangle size={28} className="admin-dialog__icon" />
        <p className="admin-dialog__message">{message}</p>
        <div className="admin-dialog__actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ background: "var(--error)" }}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────────

function OverviewPanel() {
  const [overview, setOverview] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.get("/admin/overview"), api.get("/admin/today")])
      .then(([o, t]) => {
        setOverview(o.data);
        setToday(t.data);
      })
      .catch(() => setError("Failed to load overview data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="admin-loading">
        <div className="loading-spinner" />
      </div>
    );
  if (error)
    return (
      <p className="error-message">
        {error}{" "}
        <button className="btn-tertiary" onClick={load}>
          Retry
        </button>
      </p>
    );

  const o = overview || {};
  const t = today || {};

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-page-title">Platform Overview</h2>
        <button className="btn-tertiary admin-refresh-btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <p className="detail-section-label">Platform Health</p>
      <div className="admin-stat-grid">
        <StatCard label="Total Users" value={o.totalUsers} />
        <StatCard label="Active Listings" value={o.totalActiveListings} />
        <StatCard
          label="Karma in Circulation"
          value={o.totalKarmaInCirculation}
        />
        <StatCard label="Completed Trades" value={o.totalCompletedTrades} />
        <StatCard label="In Escrow" value={o.transactionsInEscrow} />
        <StatCard label="Trades in Progress" value={o.tradesInProgress} />
        <StatCard label="Recently Active Users" value={o.recentlyActiveUsers} />
        <StatCard
          label="Active (last 30 min)"
          value={o.usersActiveLastThirtyMins}
        />
        <StatCard label="New Users Today" value={o.newUsersToday} />
        <StatCard label="New Users This Week" value={o.newUsersThisWeek} />
      </div>

      <p className="detail-section-label" style={{ marginTop: 32 }}>
        Today
      </p>
      <div className="admin-stat-grid admin-stat-grid--today">
        <StatCard label="New Signups" value={t.newSignups} />
        <StatCard label="New Listings" value={t.newListings} />
        <StatCard label="Swaps Initiated" value={t.swapsInitiated} />
        <StatCard label="Swaps Completed" value={t.swapsCompleted} />
        <StatCard label="Disputes" value={t.disputesOpenedToday} />
      </div>
    </div>
  );
}

// ─── Activity Log Panel ───────────────────────────────────────────────────────

const CATEGORIES = ["", "USER", "LISTING", "TRANSACTION", "KARMA", "ADMIN"];
const ACTIVITY_TYPES = [
  "",
  "USER_REGISTERED",
  "USER_LOGIN",
  "ITEM_LISTED",
  "ITEM_CLAIMED",
  "TRADE_PENDING",
  "TRADE_COMPLETED",
  "KARMA_GIFTED",
  "USER_SUSPENDED",
];

function ActivityPanel({ onViewUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    activityType: "",
    userId: "",
    from: "",
    to: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    api
      .get("/admin/activity-log", { params })
      .then((r) => setRows(r.data?.content ?? r.data ?? []))
      .catch(() => setError("Failed to load activity log."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, []); // initial load only; manual refresh on filter

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <h2 className="admin-page-title">Activity Log</h2>

      {/* Filters */}
      <div className="admin-filter-bar">
        <select
          className="admin-select"
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c || "All Categories"}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={filters.activityType}
          onChange={(e) => set("activityType", e.target.value)}
        >
          {ACTIVITY_TYPES.map((a) => (
            <option key={a} value={a}>
              {a || "All Types"}
            </option>
          ))}
        </select>
        <input
          className="admin-input"
          placeholder="User ID (UUID)"
          value={filters.userId}
          onChange={(e) => set("userId", e.target.value)}
        />
        <input
          className="admin-input"
          type="datetime-local"
          value={filters.from}
          onChange={(e) => set("from", e.target.value)}
        />
        <input
          className="admin-input"
          type="datetime-local"
          value={filters.to}
          onChange={(e) => set("to", e.target.value)}
        />
        <button className="btn-primary" onClick={load}>
          <Filter size={14} /> Apply
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {loading && (
        <div className="admin-loading">
          <div className="loading-spinner" />
        </div>
      )}

      {!loading && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Username</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-empty-cell">
                    No activity found.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td className="admin-td-mono">{fmtDate(r.timestamp)}</td>
                  <td>
                    <button
                      className="admin-link"
                      onClick={() => onViewUser(r.userId, r.username)}
                    >
                      {r.username ?? r.userId}
                    </button>
                  </td>
                  <td>
                    <span className="admin-badge badge--neutral">
                      {r.activityType}
                    </span>
                  </td>
                  <td>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Suspend Button ───────────────────────────────────────────────────────────

function SuspendBtn({ userId, currentStatus }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (currentStatus === "SUSPENDED" || done)
    return <span className="admin-badge badge--error">Suspended</span>;

  const doSuspend = () => {
    setLoading(true);
    api
      .post(`/admin/users/${userId}/suspend`)
      .then(() => setDone(true))
      .catch(() => alert("Suspend failed."))
      .finally(() => {
        setLoading(false);
        setConfirm(false);
      });
  };

  return (
    <>
      <button
        className="admin-danger-btn"
        onClick={() => setConfirm(true)}
        disabled={loading}
      >
        {loading ? "…" : "Suspend"}
      </button>
      {confirm && (
        <ConfirmDialog
          message={`Suspend user ${userId}? They won't be able to trade.`}
          onConfirm={doSuspend}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

// ─── User Detail Panel ────────────────────────────────────────────────────────

function UserDetailPanel({ userId, username, role, onBack }) {
  const [user, setUser] = useState(null);
  const [karma, setKarma] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [karmaPage, setKarmaPage] = useState(0);
  const [karmaHasMore, setKarmaHasMore] = useState(false);

  const loadKarma = useCallback(
    (page) => {
      api
        .get(`/admin/users/${userId}/karma-history`, {
          params: { page, size: 10 },
        })
        .then((r) => {
          const data = r.data ?? [];
          setKarma(data);
          setKarmaHasMore(data.length === 10);
          setKarmaPage(page);
        })
        .catch(() => {});
    },
    [userId],
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/admin/users/${userId}`)
      .then((r) => {
        setUser(r.data);
        setKarma(r.data.karmaHistory ?? []); // use embedded data directly
      })
      .catch(() => setError("Could not load user."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <div className="admin-loading">
        <div className="loading-spinner" />
      </div>
    );
  if (error)
    return (
      <p className="error-message">
        {error}{" "}
        <button className="admin-link" onClick={onBack}>
          ← Back
        </button>
      </p>
    );

  const u = user || {};

  return (
    <div>
      <button className="admin-back-btn" onClick={onBack}>
        ← Back
      </button>
      <h2 className="admin-page-title">@{u.username ?? username}</h2>

      <div className="admin-detail-grid">
        <div className="seller-panel">
          <p className="detail-section-label">Profile</p>
          <dl className="admin-dl">
            <dt>Email</dt> <dd>{u.email}</dd>
            <dt>Location</dt> <dd>{u.location ?? "—"}</dd>
            <dt>Bio</dt> <dd>{u.bio ?? "—"}</dd>
            <dt>Joined</dt> <dd>{fmtDate(u.joinDate)}</dd>
            <dt>Last Seen</dt> <dd>{fmtDate(u.lastSeen)}</dd>
          </dl>
        </div>

        <div className="seller-panel">
          <p className="detail-section-label">Karma</p>
          <dl className="admin-dl">
            <dt>Balance</dt> <dd>{u.karmaBalance}</dd>
            <dt>Total Earned</dt> <dd>{u.totalKarmaEarned}</dd>
            <dt>Total Spent</dt> <dd>{u.totalKarmaSpent}</dd>
          </dl>
        </div>

        <div className="seller-panel">
          <p className="detail-section-label">Activity</p>
          <dl className="admin-dl">
            <dt>Listings</dt> <dd>{u.totalListings}</dd>
            <dt>Completed Trades</dt> <dd>{u.completedTrades}</dd>
            <dt>Abandoned Trades</dt> <dd>{u.abandonedTrades}</dd>
            <dt>Followers</dt> <dd>{u.followerCount}</dd>
            <dt>Following</dt> <dd>{u.followingCount}</dd>
          </dl>
        </div>
      </div>

      {u.flags?.length > 0 && (
        <div className="seller-panel" style={{ marginTop: 16 }}>
          <p className="detail-section-label">Flags</p>
          {u.flags.map((f, i) => (
            <div key={i} className="admin-flag-row">
              <AlertTriangle size={14} /> {f.reason} —{" "}
              <em>{fmtDate(f.createdAt)}</em>
            </div>
          ))}
        </div>
      )}

      {CAN_ACT(role) && <SuspendBtn userId={userId} currentStatus={u.status} />}

      {/* Karma History */}
      <div style={{ marginTop: 28 }}>
        <p className="detail-section-label">Karma History</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {karma.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-empty-cell">
                    No karma history.
                  </td>
                </tr>
              )}
              {karma.map((k, i) => (
                <tr key={k.id ?? i}>
                  <td className="admin-td-mono">{fmtDate(k.createdAt)}</td>
                  <td>
                    <span className="admin-badge badge--neutral">{k.type}</span>
                  </td>
                  <td
                    style={{
                      color: k.amount > 0 ? "var(--success)" : "var(--error)",
                    }}
                  >
                    {k.amount > 0 ? "+" : ""}
                    {k.amount}
                  </td>
                  <td>{k.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button
            className="btn-tertiary"
            disabled={karmaPage === 0}
            onClick={() => loadKarma(karmaPage - 1)}
          >
            ← Prev
          </button>
          <span>Page {karmaPage + 1}</span>
          <button
            className="btn-tertiary"
            disabled={!karmaHasMore}
            onClick={() => loadKarma(karmaPage + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminMgmtPanel() {
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState(ROLES.MODERATOR);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [changeId, setChangeId] = useState("");
  const [changeRole, setChangeRole] = useState(ROLES.MODERATOR);

  const updateRole = () => {
    if (!changeId) return;
    setLoading(true);
    setMsg(null);
    setErr(null);
    api
      .patch(`/admin/admins/${changeId}/role`, { role: changeRole })
      .then(() => {
        setMsg(`Role updated successfully.`);
        setChangeId("");
      })
      .catch(() => setErr("Failed to update role."))
      .finally(() => setLoading(false));
  };

  const grant = () => {
    if (!email) return;
    setLoading(true);
    setMsg(null);
    setErr(null);
    api
      .post("/admin/admins", { email, role: newRole })
      .then(() => {
        setMsg(`Admin access granted to ${email}`);
        setEmail("");
      })
      .catch(() => setErr("Failed to grant admin access."))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2 className="admin-page-title">Admin Management</h2>
      <div className="seller-panel" style={{ maxWidth: 480 }}>
        <p className="detail-section-label">Grant Admin Access</p>
        <div className="admin-form-row">
          <input
            className="admin-input"
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="admin-select"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
            <option value={ROLES.MODERATOR}>MODERATOR</option>
            <option value={ROLES.OBSERVER}>OBSERVER</option>
          </select>
          <button
            className="btn-primary"
            onClick={grant}
            disabled={loading || !email}
          >
            {loading ? "…" : "Grant"}
          </button>
          <p className="detail-section-label" style={{ marginTop: 24 }}>
            Change Admin Role
          </p>
          <div className="admin-form-row">
            <input
              className="admin-input"
              placeholder="Admin user ID (UUID)"
              value={changeId}
              onChange={(e) => setChangeId(e.target.value)}
            />
            <select
              className="admin-select"
              value={changeRole}
              onChange={(e) => setChangeRole(e.target.value)}
            >
              <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
              <option value={ROLES.MODERATOR}>MODERATOR</option>
              <option value={ROLES.OBSERVER}>OBSERVER</option>
            </select>
            <button
              className="btn-primary"
              onClick={updateRole}
              disabled={loading || !changeId}
            >
              Update
            </button>
          </div>
        </div>
        {msg && <p className="success-message">{msg}</p>}
        {err && <p className="error-message">{err}</p>}
      </div>
    </div>
  );
}

// ─── Main AdminApp ─────────────────────────────────────────────────────────────

export default function AdminApp() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("overview");
  const [viewUser, setViewUser] = useState(null); // { id, username }

  useEffect(() => {
    api
      .get("/admin/me")
      .then((r) => setAdminUser(r.data))
      .catch(() => navigate("/marketplace"))
      .finally(() => setChecking(false));
  }, [navigate]);

  if (checking)
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    );
  if (!adminUser) return null;

  const role = adminUser.role;

  const handleViewUser = (id, username) => {
    setViewUser({ id, username });
    setSection("userdetail");
  };

  const navTo = (id) => {
    setViewUser(null);
    setSection(id);
  };

  const renderContent = () => {
    if (section === "userdetail" && viewUser) {
      return (
        <UserDetailPanel
          userId={viewUser.id}
          username={viewUser.username}
          role={role}
          onBack={() => navTo("users")}
        />
      );
    }
    if (!canSeeSection(section, role))
      return <p className="error-message">Access denied.</p>;
    switch (section) {
      case "overview":
        return <OverviewPanel />;
      case "activity":
        return <ActivityPanel onViewUser={handleViewUser} />;
      case "karma":
        return <KarmaEconomyPanel />;
      case "escrow":
        return <EscrowPanel role={role} />;
      case "flags":
        return <FlagsPanel onViewUser={handleViewUser} />;
      case "users":
        return <UsersPanel role={role} onViewUser={handleViewUser} />;
      case "disputes":
        return <DisputesPanel />;
      case "adminmgmt":
        return <AdminMgmtPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__logo">KS</span>
          <span className="admin-sidebar__name">Admin</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            if (!canSeeSection(item.id, role)) return null;
            const Icon = item.icon;
            const active =
              section === item.id ||
              (item.id === "users" && section === "userdetail");
            return (
              <button
                key={item.id}
                className={`admin-nav__item ${active ? "admin-nav__item--active" : ""}`}
                onClick={() => navTo(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {active && (
                  <ChevronRight size={14} className="admin-nav__chevron" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__username">@{adminUser.username}</div>
            <span className={roleBadgeClass(role)}>{role}</span>
          </div>
          <button
            className="admin-logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/marketplace");
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-content">{renderContent()}</div>
      </main>
    </div>
  );
}
