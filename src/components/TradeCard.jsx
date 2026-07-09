import React, { useState, useEffect } from "react";
import { acknowledgeEscrow } from "../api/escrow";

const STATUS_LABELS = {
  ESCROW: "Karma Locked",
  DISPATCHED: "In Transit",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ABANDONED: "Abandoned",
};

const isTerminal = (status) =>
  ["COMPLETED", "CANCELLED", "ABANDONED"].includes(
    String(status || "").toUpperCase(),
  );

// Returns { label, urgent } for seller 72hr abandonment countdown
function useAbandonCountdown(trade, isSeller, status) {
  const [chip, setChip] = useState(null);

  useEffect(() => {
    if (!isSeller || status !== "ESCROW") {
      setChip(null);
      return;
    }

    // createdAt + 72hrs = abandon deadline
    const createdAt = trade.createdAt || trade.raw?.createdAt;
    if (!createdAt) return;

    const deadline = new Date(createdAt).getTime() + 72 * 60 * 60 * 1000;

    const update = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setChip({ label: "Expires soon", urgent: true });
        return;
      }
      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const urgent = remaining < 12 * 60 * 60 * 1000; // under 12hrs
      setChip({
        label: h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`,
        urgent,
      });
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [isSeller, status, trade.createdAt, trade.raw?.createdAt]);

  return chip;
}

export default function TradeCard({
  trade,
  currentUser,
  currentProfile,
  onClick,
  onAcknowledged,
}) {
  const [acknowledging, setAcknowledging] = useState(false);

  const profileId = currentProfile?.id || currentProfile?.accountId;
  const userId = currentUser?.id || currentUser?.email;

  const isSeller =
    (profileId && trade.sellerId === profileId) ||
    (currentUser?.email && trade.sellerName === currentUser?.username) ||
    trade.sellerId === userId;

  const status = String(trade.status || "ESCROW").toUpperCase();
  const statusLabel = STATUS_LABELS[status] || status;
  const terminal = isTerminal(status);
  const acknowledged = trade.acknowledged;
  const isAbandoned = status === "ABANDONED";
  const isDisputed = String(trade.disputeStatus || "").toUpperCase() === "PENDING";

  const abandonChip = useAbandonCountdown(trade, isSeller, status);

  // CTA label
  const ctaLabel = (() => {
    if (isSeller) {
      if (status === "ESCROW") return "Mark as Dispatched";
      if (status === "DISPATCHED" || status === "DELIVERED")
        return "Waiting for buyer...";
      if (terminal) return acknowledged ? null : "Acknowledge";
    } else {
      if (status === "ESCROW") return "Waiting for dispatch...";
      if (status === "DISPATCHED" || status === "DELIVERED")
        return "Confirm Received";
      if (terminal) return acknowledged ? null : "Acknowledge";
    }
    return null;
  })();

  // Fix: seller enabled on ESCROW
  const ctaDisabled = (() => {
    if (isSeller && status === "ESCROW") return false;
    if (!isSeller && status === "ESCROW") return true;
    if (isSeller && (status === "DISPATCHED" || status === "DELIVERED"))
      return true;
    return false;
  })();

  const handleAcknowledge = async (e) => {
    e.stopPropagation();
    setAcknowledging(true);
    try {
      await acknowledgeEscrow(trade.escrowId || trade.id);
      onAcknowledged?.();
    } catch (err) {
      console.error("Acknowledge failed:", err);
    } finally {
      setAcknowledging(false);
    }
  };

  const imageUrl = trade.itemImageUrl || trade.item?.imageUrl || "";
  const otherParty = isSeller
    ? trade.buyerName || "Buyer"
    : trade.sellerName || "Seller";
  const karma = trade.lockedKarma || trade.karmaAmount || 0;

  return (
    <div
      className={`trade-card ${isSeller ? "trade-selling" : "trade-buying"} ${isAbandoned ? "trade-abandoned" : ""}`}
      onClick={onClick}
    >
      {/* Role tag */}
      <span className={`trade-role-tag ${isSeller ? "selling" : "buying"}`}>
        {isSeller ? "Selling" : "Buying"}
      </span>

      <div className="trade-card-body">
        {/* Item image */}
        <div className="trade-card-image">
          {imageUrl ? (
            <img src={imageUrl} alt={trade.itemTitle} />
          ) : (
            <div className="trade-card-image-placeholder">📦</div>
          )}
        </div>

        {/* Info */}
        <div className="trade-card-info">
          <h4 className="trade-card-title">
            {trade.itemTitle || "Trade Item"}
          </h4>
          <p className="trade-card-party">
            {isSeller ? "Buyer" : "Seller"}: <strong>{otherParty}</strong>
          </p>
          <div className="trade-card-meta">
            <span className="trade-karma">✨ {karma} Karma</span>
            <span
              className={`trade-status-badge status-${status.toLowerCase()}`}
            >
              {statusLabel}
            </span>
            {isDisputed && (
              <span className="trade-status-badge status-disputed">
                ⚖️ Disputed
              </span>
            )}
          </div>

          {/* Abandoned notice */}
          {isAbandoned && (
            <span className="trade-abandoned-notice">
              ⏰ Trade expired due to inactivity
            </span>
          )}

          {/* Seller 72hr countdown chip */}
          {abandonChip && (
            <span
              className={`trade-abandon-chip ${abandonChip.urgent ? "urgent" : ""}`}
            >
              ⚠️ {abandonChip.label}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="trade-card-action" onClick={(e) => e.stopPropagation()}>
          {terminal && !acknowledged && (
            <button
              className="btn-secondary trade-ack-btn"
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging ? "..." : "Acknowledge"}
            </button>
          )}
          {!terminal && ctaLabel && (
            <button
              className={`trade-cta-btn ${ctaDisabled ? "disabled" : isSeller ? "seller-cta" : "buyer-cta"}`}
              disabled={ctaDisabled}
              onClick={onClick}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
