import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import TrustBadge from "./TrustBadge";
import { useNavigate } from "react-router-dom";

const DELIVERY_METHODS = [
  {
    value: "meetup",
    label: "Meetup",
    description: "Coordinate a safe handoff in person.",
    available: true,
  },
  {
    value: "delivery",
    label: "Local Delivery",
    description: "Arrange dropoff within your area.",
    available: false,
  },
  {
    value: "shipping",
    label: "Shipping",
    description: "Send it through a tracked carrier.",
    available: false,
  },
];

const getTrustLevel = (item) => {
  const escrowProtected = Boolean(
    item.escrowProtected ?? item.escrow_protected,
  );
  const sellerVerified = Boolean(
    item.sellerVerified ?? item.seller_verified ?? item.owner?.verified,
  );
  const karmaValue = item.karmaValue ?? item.karma_value ?? 0;
  if (escrowProtected && sellerVerified && karmaValue >= 100) return "elite";
  if (sellerVerified) return "trusted";
  if (escrowProtected) return "safe";
  return "unverified";
};

const getOwnerName = (item) =>
  item?.owner?.fullName ||
  item?.owner?.full_name ||
  item?.owner?.username ||
  item?.ownerName ||
  item?.owner_name ||
  item?.ownerUsername ||
  item?.owner_username ||
  item?.ownerEmail ||
  "Unknown owner";

export default function ItemDetail({ item, onBack, onStartCheckout }) {
  const { user, profile } = useAuth();
  const [deliveryMethod, setDeliveryMethod] = useState("meetup");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const trustLevel = useMemo(() => getTrustLevel(item), [item]);
  const ownerName = useMemo(() => getOwnerName(item), [item]);

  const karmaBalance =
    profile?.karmaBalance ?? profile?.karma_balance ?? user?.karma_balance ?? 0;
  const karmaValue = item?.karmaValue ?? item?.karma_value ?? 0;

  // ── description: cover all likely field names ──
  const description =
    item?.description || item?.desc || item?.details || item?.body || "";

  const isOwner = Boolean(
    user &&
    (item?.ownerId === user.id ||
      item?.owner_id === user.id ||
      item?.owner?.id === user.id ||
      item?.ownerUsername === profile?.username ||
      item?.owner?.username === profile?.username),
  );
  const canAfford = karmaBalance >= karmaValue;

  const handleStartCheckout = () => {
    if (isOwner) {
      setError("You cannot start escrow on your own listing.");
      return;
    }
    if (!canAfford) {
      setError(`You need ${karmaValue - karmaBalance} more karma to continue.`);
      return;
    }
    setError("");
    onStartCheckout?.({ item, deliveryMethod });
  };

  if (!item) return null;

  const imageUrl = item.imageUrl || item.image_url;
  const ownerLocation = item?.owner?.location || item?.ownerLocation || "";

  return (
    <section className="item-detail-page">
      <div className="item-detail-shell">
        <button className="back-btn detail-back-btn" onClick={onBack}>
          ← Back to Marketplace
        </button>

        <div className="item-detail-layout">
          {/* ── LEFT COLUMN ── */}
          <div className="item-detail-main">
            {/* Image */}
            <div className="item-detail-media">
              {imageUrl ? (
                <img src={imageUrl} alt={item.title} className="detail-image" />
              ) : (
                <div className="detail-image detail-image-fallback">
                  <span>No image available</span>
                </div>
              )}
            </div>

            {/* Title + trust badge */}
            <div className="item-detail-title-row">
              <TrustBadge level={trustLevel} />
              <h2 className="item-detail-title">{item.title}</h2>
            </div>

            {/* ── Description — the section buyers actually need ── */}
            <div className="item-detail-section">
              <span className="detail-section-label">Description</span>
              {description ? (
                <p className="item-detail-description">{description}</p>
              ) : (
                <p className="item-detail-description item-detail-description--empty">
                  No description provided.
                </p>
              )}
            </div>

            {/* Meta chips */}
            <div className="item-detail-meta">
              <div className="detail-meta-card">
                <span className="detail-meta-label">Condition</span>
                <strong>{item.condition || "Not specified"}</strong>
              </div>
              <div className="detail-meta-card">
                <span className="detail-meta-label">Category</span>
                <strong>{item.category || "Other"}</strong>
              </div>
              <div className="detail-meta-card">
                <span className="detail-meta-label">Karma Cost</span>
                <strong>✨ {karmaValue}</strong>
              </div>
            </div>

            {/* Owner card */}
            <div
              className="detail-owner-card clickable-user"
              onClick={() =>
                navigate(`/profile/${item.owner?.username || ownerName}`)
              }
            >
              <span className="detail-section-label">Owner</span>
              <div className="detail-owner-info">
                <strong className="detail-owner-name">{ownerName}</strong>
                {ownerLocation && (
                  <span className="detail-owner-location">
                    📍 {ownerLocation}
                  </span>
                )}
              </div>
              <span className="detail-owner-arrow">→</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN — Escrow panel ── */}
          <aside className="detail-action-panel">
            <div className="detail-escrow-card">
              <span className="detail-section-label">Escrow</span>
              <h3>Protected claim flow</h3>
              <p className="detail-escrow-copy">
                Review your delivery method now, then confirm the escrow lock on
                the next screen before the seller can proceed.
              </p>

              <div className="detail-balance-row">
                <span>Your Karma</span>
                <strong>{karmaBalance}</strong>
              </div>

              <div className="delivery-picker">
                {DELIVERY_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`delivery-option detail-delivery-option
                      ${deliveryMethod === method.value ? " selected" : ""}
                      ${!method.available ? " coming-soon" : ""}
                    `}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={method.value}
                      checked={deliveryMethod === method.value}
                      onChange={(e) =>
                        method.available && setDeliveryMethod(e.target.value)
                      }
                      disabled={!method.available}
                    />
                    <span className="delivery-option-copy">
                      <span className="delivery-label">
                        {method.label}
                        {!method.available && (
                          <span className="coming-soon-badge">Coming soon</span>
                        )}
                      </span>
                      <span className="delivery-description">
                        {method.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>              

              {error && <div className="error-message">{error}</div>}

              {isOwner ? (
                <div className="owner-notice">
                  🛒 This is your listing — you can't claim your own item.
                </div>
              ) : (
                <>
                  {!canAfford && (
                    <div className="detail-afford-warning">
                      You need{" "}
                      <strong>{karmaValue - karmaBalance} more karma</strong> to
                      start escrow.
                    </div>
                  )}
                  <button
                    className="escrow-btn detail-escrow-btn"
                    onClick={handleStartCheckout}
                    disabled={!canAfford}
                  >
                    Review & Lock Karma
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
