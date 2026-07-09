import React, { useMemo, useState } from "react";
import { startEscrow } from "../api/escrow";
import { useAuth } from "../contexts/AuthContext";

const ESCROW_HOLD_SECONDS = 48 * 60 * 60;

const DELIVERY_COPY = {
  meetup: {
    title: "Meetup Details",
    label: "Meetup plan",
    placeholder: "Enter meetup location, time window, or safety notes",
  },
  delivery: {
    title: "Delivery Address",
    label: "Delivery address",
    placeholder: "Enter the local delivery address and drop off notes",
  },
  shipping: {
    title: "Shipping Address",
    label: "Shipping address",
    placeholder: "Enter the shipping address and any instructions",
  },
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

const isItemOwner = (item, user) => {
  if (!item || !user) return false;

  // Primary — ID comparison only
  const itemOwnerId = item?.ownerId || item?.owner_id || item?.owner?.id;
  const userId = user?.id || user?.userId || user?.user_id;

  if (itemOwnerId && userId) {
    return String(itemOwnerId) === String(userId);
  }

  // Fallback — email only if no IDs available
  const itemOwnerEmail = item?.ownerEmail || item?.owner_email || item?.owner?.email;
  const userEmail = user?.email;

  if (itemOwnerEmail && userEmail) {
    return String(itemOwnerEmail).toLowerCase() === String(userEmail).toLowerCase();
  }

  return false;
};

export default function CheckoutEscrowConfirmation({
  item,
  deliveryMethod,
  onBack,
  onConfirmed,
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [deliveryDetails, setDeliveryDetails] = useState(profile?.location || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const karmaBalance = profile?.karmaBalance ?? profile?.karma_balance ?? user?.karma_balance ?? 0;
  const lockedKarma = item?.karmaValue ?? item?.karma_value ?? 0;
  const hasEnoughKarma = karmaBalance >= lockedKarma;
  const deliveryCopy = DELIVERY_COPY[deliveryMethod] || DELIVERY_COPY.meetup;
  const ownerName = useMemo(() => getOwnerName(item), [item]);
  const isOwner = useMemo(() => isItemOwner(item, user), [item, user]);
  const buyerName =
    user?.username ||
    user?.fullName ||
    user?.full_name ||
    user?.email ||
    "Buyer";

  const handleConfirm = async () => {
    if (!item?.id || submitting) return;
    if (isOwner) {
      setError("You cannot escrow your own listing.");
      return;
    }
    if (!deliveryDetails.trim()) {
      setError("Add your delivery address or meetup details before continuing.");
      return;
    }
    if (!hasEnoughKarma) {
      setError(`You need ${lockedKarma - karmaBalance} more karma to lock this order.`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const escrowOrder = await startEscrow(item.id, {
        deliveryMethod,
        deliveryDetails: deliveryDetails.trim(),
      });

      const refreshedProfile = await refreshProfile?.();
      const nextBalance =
        refreshedProfile?.karmaBalance ??
        refreshedProfile?.karma_balance ??
        Math.max(karmaBalance - lockedKarma, 0);

      const normalizedOrder = {
        ...escrowOrder,
        id: escrowOrder.escrowId || escrowOrder.id || `${item.id}-${Date.now()}`,
        escrowId: escrowOrder.escrowId || escrowOrder.id,
        item: escrowOrder.item || item,
        itemId: escrowOrder.itemId || item.id,
        sellerName: escrowOrder.sellerName || ownerName,
        buyerName: escrowOrder.buyerName || buyerName,
        deliveryMethod,
        deliveryDetails: deliveryDetails.trim(),
        status: escrowOrder.status || "Awaiting_Dispatch",
        lockedKarma: escrowOrder.lockedKarma || lockedKarma,
        carbonSavedKg:
          escrowOrder.carbonSavedKg ??
          Math.max(1, Math.round((lockedKarma || 10) * 0.4)),
        availableKarmaAfter: nextBalance,
        placedAt: escrowOrder.placedAt || new Date().toISOString(),
        trackingNumber: escrowOrder.trackingNumber || "",
        escrowReleaseAt:
          escrowOrder.escrowReleaseAt ||
          new Date(Date.now() + ESCROW_HOLD_SECONDS * 1000).toISOString(),
      };

      onConfirmed?.(normalizedOrder);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to lock karma in escrow.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <section className="checkout-page">
      <div className="checkout-shell">
        <button className="back-btn" onClick={onBack}>
          Back to Item Detail
        </button>

        <div className="checkout-layout">
          <div className="checkout-panel">
            <div className="checkout-card">
              <span className="detail-section-label">Order Summary</span>
              <div className="checkout-summary">
                {item.imageUrl || item.image_url ? (
                  <img
                    src={item.imageUrl || item.image_url}
                    alt={item.title}
                    className="checkout-summary-image"
                  />
                ) : (
                  <div className="checkout-summary-image checkout-summary-fallback">[No image]</div>
                )}

                <div className="checkout-summary-copy">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="checkout-summary-grid">
                    <div>
                      <span className="detail-meta-label">Seller</span>
                      <strong>{ownerName}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Delivery Method</span>
                      <strong>{deliveryCopy.title}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Karma To Lock</span>
                      <strong>{lockedKarma}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Current Balance</span>
                      <strong>{karmaBalance}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="checkout-card">
              <span className="detail-section-label">{deliveryCopy.title}</span>
              <label className="checkout-label" htmlFor="deliveryDetails">
                {deliveryCopy.label}
              </label>
              <textarea
                id="deliveryDetails"
                className="checkout-textarea"
                rows="5"
                value={deliveryDetails}
                placeholder={deliveryCopy.placeholder}
                onChange={(e) => setDeliveryDetails(e.target.value)}
              />
            </div>
          </div>

          <aside className="checkout-sidebar">
            <div className="checkout-card checkout-card-emphasis">
              <span className="detail-section-label">Escrow Confirmation</span>
              <p className="escrow-warning">
                Your {lockedKarma} Karma points will be securely held in the Karma
                Exchange Escrow. The seller will not receive them until you confirm
                delivery.
              </p>

              <ul className="checkout-logic-list">
                <li>System checks whether you have enough Available Karma.</li>
                <li>{lockedKarma} Karma moves from your available balance into escrow.</li>
                <li>The order is marked as Awaiting Shipment after confirmation.</li>
              </ul>

              {!hasEnoughKarma && (
                <div className="error-message">
                  You need {lockedKarma - karmaBalance} more karma to continue.
                </div>
              )}
              {isOwner && (
                <div className="error-message">
                  You cannot escrow your own listing.
                </div>
              )}
              {error && <div className="error-message">{error}</div>}

              <button
                className="escrow-btn checkout-confirm-btn"
                onClick={handleConfirm}
                disabled={submitting || !hasEnoughKarma || isOwner}
              >
                {submitting ? "Locking Karma..." : "Confirm & Lock Karma"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
