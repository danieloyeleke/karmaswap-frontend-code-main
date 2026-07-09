import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../api/axios";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function elapsed(from, to) {
  if (!from || !to) return null;
  const ms = new Date(to) - new Date(from);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function trustBadge(score) {
  if (score >= 91)
    return { label: "Platinum", fill: "E8F4FD", color: "1565C0" };
  if (score >= 71) return { label: "Gold", fill: "FFF8E1", color: "F57F17" };
  if (score >= 51) return { label: "Silver", fill: "F5F5F5", color: "546E7A" };
  if (score >= 31) return { label: "Bronze", fill: "FBE9E7", color: "BF360C" };
  return { label: "None", fill: "FAFAFA", color: "9E9E9E" };
}

function TrustBadge({ score }) {
  const { label, fill, color } = trustBadge(score);
  return (
    <span
      className="admin-badge"
      style={{ background: `#${fill}`, color: `#${color}` }}
    >
      {label} · {score}/100
    </span>
  );
}

function parseEvidenceUrls(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Dispute Queue ─────────────────────────────────────────────────────────────

function DisputeQueue({ onOpen }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get("/disputes/open")
      .then((r) => setRows(r.data ?? []))
      .catch(() => setError("Failed to load open disputes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-page-title">Dispute Resolution</h2>
        <button className="btn-tertiary admin-refresh-btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
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
                <th>Dispute ID</th>
                <th>Reason</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Item</th>
                <th>Raised</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-empty-cell">
                    No open disputes.
                  </td>
                </tr>
              )}
              {rows.map((d) => (
                <tr key={d.disputeId}>
                  <td className="admin-td-mono">{d.disputeId?.slice(0, 8)}…</td>
                  <td>
                    <span className="admin-badge badge--warn">{d.reason}</span>
                  </td>
                  <td>{d.buyerUsername}</td>
                  <td>{d.sellerUsername}</td>
                  <td>{d.itemTitle ?? "—"}</td>
                  <td className="admin-td-mono">
                    {fmtDate(d.disputeCreatedAt)}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${d.status === "OPEN" ? "badge--error" : "badge--success"}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => onOpen(d.disputeId)}
                    >
                      Review
                    </button>
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

// ── Dispute Detail ────────────────────────────────────────────────────────────

function DisputeDetail({ disputeId, onBack }) {
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [resolved, setResolved] = useState(null); // the resolved dispute object

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/disputes/${disputeId}`)
      .then((r) => setDispute(r.data))
      .catch(() => setError("Failed to load dispute case."))
      .finally(() => setLoading(false));
  }, [disputeId]);

  const resolve = (resolution) => {
    if (!reason.trim()) return;
    setResolving(true);
    setResolveError(null);
    api
      .post(`/disputes/${disputeId}/resolve`, {
        resolution,
        adminReason: reason.trim(),
      })
      .then((r) => setResolved(r.data))
      .catch((err) => {
        const msg = err?.response?.data?.message;
        setResolveError(msg ?? "Resolution failed. Please try again.");
      })
      .finally(() => setResolving(false));
  };

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

  const d = dispute || {};
  const evidenceUrls = parseEvidenceUrls(d.evidenceImageUrls);
  const canSubmit = reason.trim().length > 0 && !resolving && !resolved;

  return (
    <div>
      <button className="admin-back-btn" onClick={onBack}>
        <ArrowLeft size={14} /> Back to disputes
      </button>

      <h2 className="admin-page-title">
        Dispute Case
        <span
          className="admin-td-mono"
          style={{ fontSize: 14, fontWeight: 400 }}
        >
          {d.disputeId?.slice(0, 8)}…
        </span>
        <span
          className={`admin-badge ${d.status === "OPEN" ? "badge--error" : "badge--success"}`}
        >
          {d.status}
        </span>
      </h2>

      {/* ── Parties ── */}
      <div
        className="admin-detail-grid"
        style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}
      >
        <div className="seller-panel">
          <p className="detail-section-label">Buyer</p>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            @{d.buyerUsername}
          </div>
          <TrustBadge score={d.buyerTrustScore} />
          {d.raisedBy === d.buyerUsername && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--error)",
                fontWeight: 600,
              }}
            >
              ⚑ Raised this dispute
            </div>
          )}
        </div>
        <div className="seller-panel">
          <p className="detail-section-label">Seller</p>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            @{d.sellerUsername}
          </div>
          <TrustBadge score={d.sellerTrustScore} />
          {d.raisedBy === d.sellerUsername && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--error)",
                fontWeight: 600,
              }}
            >
              ⚑ Raised this dispute
            </div>
          )}
        </div>
      </div>

      {/* ── Item & Dispute Summary ── */}
      <div className="seller-panel" style={{ marginBottom: 16 }}>
        <p className="detail-section-label">Item &amp; Dispute</p>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {d.itemImageUrl && (
            <img
              src={d.itemImageUrl}
              alt={d.itemTitle}
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              {d.itemTitle ?? "—"}
            </div>
            <span
              className="admin-badge badge--warn"
              style={{ marginBottom: 8, display: "inline-block" }}
            >
              {d.reason}
            </span>
            <p
              style={{
                fontSize: 13,
                color: "var(--text)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {d.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Evidence images ── */}
      {evidenceUrls.length > 0 && (
        <div className="seller-panel" style={{ marginBottom: 16 }}>
          <p className="detail-section-label">
            Evidence Images ({evidenceUrls.length})
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {evidenceUrls.map((url, i) => (
              <a href={url} target="_blank" rel="noopener noreferrer" key={i}>
                <img
                  src={url}
                  alt={`Evidence ${i + 1}`}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Escrow Timeline ── */}
      <div className="seller-panel" style={{ marginBottom: 16 }}>
        <p className="detail-section-label">Escrow Timeline</p>
        <div className="admin-timeline">
          <div className="admin-timeline__item">
            <div className="admin-timeline__dot admin-timeline__dot--done" />
            <div>
              <div className="admin-timeline__label">Karma locked</div>
              <div className="admin-timeline__time">
                {fmtDate(d.escrowCreatedAt)}
              </div>
            </div>
          </div>

          <div className="admin-timeline__item">
            <div
              className={`admin-timeline__dot ${d.dispatchedAt ? "admin-timeline__dot--done" : "admin-timeline__dot--pending"}`}
            />
            <div>
              <div className="admin-timeline__label">Dispatched</div>
              <div className="admin-timeline__time">
                {d.dispatchedAt ? (
                  <>
                    {fmtDate(d.dispatchedAt)}{" "}
                    <span className="admin-elapsed">
                      ({elapsed(d.escrowCreatedAt, d.dispatchedAt)} after lock)
                    </span>
                  </>
                ) : (
                  "Not yet dispatched"
                )}
              </div>
              {d.trackingNumber && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-light)",
                    marginTop: 2,
                  }}
                >
                  Tracking:{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    {d.trackingNumber}
                  </span>
                </div>
              )}
              {d.preShipmentPhoto && (
                <a
                  href={d.preShipmentPhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "var(--primary)" }}
                >
                  View pre-shipment photo
                </a>
              )}
            </div>
          </div>

          <div className="admin-timeline__item">
            <div className="admin-timeline__dot admin-timeline__dot--dispute" />
            <div>
              <div className="admin-timeline__label">Dispute raised</div>
              <div className="admin-timeline__time">
                {fmtDate(d.disputeCreatedAt)}
                {d.dispatchedAt && (
                  <span className="admin-elapsed">
                    {" "}
                    ({elapsed(d.dispatchedAt, d.disputeCreatedAt)} after
                    dispatch)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat Transcript ── */}
      <div className="seller-panel" style={{ marginBottom: 16 }}>
        <p className="detail-section-label">
          Chat Transcript ({d.chatHistory?.length ?? 0} messages)
        </p>
        {(!d.chatHistory || d.chatHistory.length === 0) && (
          <p style={{ fontSize: 13, color: "var(--text-light)" }}>
            No messages on this trade.
          </p>
        )}
        <div className="admin-chat">
          {(d.chatHistory ?? []).map((msg, i) => (
            <div key={i} className="admin-chat__message">
              <div className="admin-chat__meta">
                <span className="admin-chat__sender">{msg.senderEmail}</span>
                <span className="admin-chat__time">
                  {fmtDate(msg.timestamp)}
                </span>
              </div>
              {msg.content && (
                <div className="admin-chat__content">{msg.content}</div>
              )}
              {msg.imageUrl && (
                <a
                  href={msg.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={msg.imageUrl}
                    alt="Chat image"
                    style={{
                      maxWidth: 200,
                      borderRadius: 8,
                      marginTop: 6,
                      border: "1px solid var(--border)",
                    }}
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Resolution (if already resolved) ── */}
      {resolved && (
        <div
          className="seller-panel admin-resolved-panel"
          style={{ marginBottom: 16 }}
        >
          <p className="detail-section-label">Resolution</p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span className="admin-badge badge--success">
              {resolved.resolution}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-light)" }}>
              {fmtDate(resolved.resolvedAt ?? new Date().toISOString())}
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong>Reason:</strong> {resolved.adminReason ?? reason}
          </p>
        </div>
      )}

      {/* ── Resolution Form (only if still open) ── */}
      {!resolved && d.status === "OPEN" && (
        <div className="seller-panel admin-resolve-panel">
          <p className="detail-section-label">Resolve Dispute</p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-light)",
              marginBottom: 12,
              lineHeight: 1.6,
            }}
          >
            This decision is permanent. Both parties will be notified
            immediately.
          </p>

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-light)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            Reason for this decision{" "}
            <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <textarea
            className="admin-textarea"
            placeholder="Explain why you are making this decision. This will be permanently attached to the dispute record."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          {reason.trim().length === 0 && reason.length > 0 && (
            <p
              style={{ fontSize: 12, color: "var(--error)", margin: "4px 0 0" }}
            >
              Reason cannot be whitespace only.
            </p>
          )}

          {resolveError && (
            <p className="error-message" style={{ marginTop: 10 }}>
              {resolveError}
            </p>
          )}

          <div className="admin-resolve-actions">
            <button
              className="admin-resolve-btn admin-resolve-btn--refund"
              disabled={!canSubmit}
              onClick={() => resolve("REFUND_BUYER")}
            >
              {resolving ? "Resolving…" : "Refund Buyer"}
              <span className="admin-resolve-btn__sub">
                Returns karma to buyer · Cancels trade · Item re-listed
              </span>
            </button>
            <button
              className="admin-resolve-btn admin-resolve-btn--release"
              disabled={!canSubmit}
              onClick={() => resolve("RELEASE_SELLER")}
            >
              {resolving ? "Resolving…" : "Release to Seller"}
              <span className="admin-resolve-btn__sub">
                Releases karma to seller · Marks trade complete
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function DisputesPanel() {
  const [openDisputeId, setOpenDisputeId] = useState(null);

  if (openDisputeId) {
    return (
      <DisputeDetail
        disputeId={openDisputeId}
        onBack={() => setOpenDisputeId(null)}
      />
    );
  }
  return <DisputeQueue onOpen={setOpenDisputeId} />;
}
