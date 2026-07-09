import React, { useEffect, useMemo, useState } from "react";
import { completeEscrow } from "../api/escrow";
import { useAuth } from "../contexts/AuthContext";
import OrderChat from "./OrderChat";

const STATUS_ALIASES = {
  ESCROW: "Awaiting_Dispatch",
  AWAITING_DISPATCH: "Awaiting_Dispatch",
  PAYMENT_SECURED_ESCROW: "Payment_Secured_Escrow",
  IN_TRANSIT: "In_Transit",
  DISPATCHED: "In_Transit",
  DELIVERED: "Received_Pending_Review",
  RECEIVED_PENDING_REVIEW: "Received_Pending_Review",
  COMPLETED: "Funds_Released",
  FUNDS_RELEASED: "Funds_Released",
  CLOSED_LOOP_COMPLETE: "Closed_Loop_Complete",
};

const STAGES = [
  { key: "Payment_Secured_Escrow", label: "Escrow" },
  { key: "In_Transit", label: "Shipped" },
  { key: "Received_Pending_Review", label: "Delivered" },
  { key: "Funds_Released", label: "Completed" },
];

const normalizeStatus = (status) => {
  if (!status) return "Awaiting_Dispatch";
  const raw = String(status).toUpperCase();
  return (
    STATUS_ALIASES[raw] ||
    STAGES.find((entry) => raw.includes(entry.key.toUpperCase()))?.key ||
    "Awaiting_Dispatch"
  );
};

const getStageIndex = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "Awaiting_Dispatch") return 0;
  const index = STAGES.findIndex((stage) => stage.key === normalized);
  return index === -1 ? 0 : index;
};

const getStatusMeta = (status) => {
  const normalized = normalizeStatus(status);
  if (
    normalized === "Funds_Released" ||
    normalized === "Closed_Loop_Complete"
  ) {
    return { label: "Completed", tone: "complete" };
  }
  if (normalized === "Received_Pending_Review") {
    return { label: "Delivered", tone: "progress" };
  }
  if (normalized === "In_Transit") {
    return { label: "Shipped", tone: "progress" };
  }
  return { label: "In Escrow", tone: "pending" };
};

const formatCountdown = (seconds) => {
  if (seconds <= 0) return "Ready for release";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m left`;
};

const getInitial = (name, fallback) =>
  String(name || fallback || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

export default function BuyerEscrowView({
  order,
  onConfirmed,
  onBack,
  onDispute,
}) {
  const { user, refreshProfile } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingSeconds = useMemo(() => {
    if (!order?.escrowReleaseAt) return 0;
    const releaseAt = new Date(order.escrowReleaseAt).getTime();
    return Math.max(0, Math.floor((releaseAt - now) / 1000));
  }, [now, order?.escrowReleaseAt]);

  if (!order) {
    return (
      <section className="buyer-escrow-view">
        <div className="checkout-shell">
          <button className="back-btn" onClick={onBack}>
            Back
          </button>
          <p>No order selected.</p>
        </div>
      </section>
    );
  }

  const item = order.item || {};
  const itemTitle = item.title || order.itemTitle || "Marketplace item";
  const itemImage = item.imageUrl || item.image_url || order.itemImage || "";
  const buyerName =
    order.buyerName ||
    user?.username ||
    user?.fullName ||
    user?.email ||
    "Buyer";
  const sellerName =
    order.sellerName ||
    order.seller?.username ||
    order.seller?.email ||
    item.owner?.username ||
    item.owner?.email ||
    "Seller";
  const deliveryMethod = order.deliveryMethod || "Delivery method pending";
  const deliveryDetails = order.deliveryDetails || "Delivery details pending";
  const lockedKarma = order.lockedKarma || 0;
  const statusMeta = getStatusMeta(order.status);
  const stageIndex = getStageIndex(order.status);
  const escrowId = order.escrowId || order.id;
  const buyerId =
    order.buyerId || order.buyer_id || order.buyer?.id || user?.id;
  const sellerId =
    order.sellerId ||
    order.seller_id ||
    item.ownerId ||
    item.owner_id ||
    item.owner?.id;
  const itemId = item.id || item._id || order.itemId || order.item_id || "item";
  const isComplete = statusMeta.tone === "complete";
  const isDispute = /dispute/i.test(order.status || "");
  const canConfirm = stageIndex >= 2 && !isComplete && !isDispute;

  const handleConfirmReceipt = async () => {
    if (!escrowId) {
      setError("Invalid escrow ID.");
      return;
    }

    setConfirming(true);
    setError("");
    setSuccess(false);

    try {
      const updated = await completeEscrow(escrowId);
      await refreshProfile?.();
      setSuccess(true);
      onConfirmed?.({
        ...order,
        ...(updated || {}),
        status: updated?.status || "Funds_Released",
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to confirm receipt. Please try again.",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="buyer-escrow-view buyer-escrow-page">
      <div className="buyer-escrow-shell">
        <div className="buyer-escrow-header">
          <div>
            <span className="detail-section-label">Buyer Escrow</span>
            <h2>Order Protection</h2>
            <p>
              Track delivery, talk with the seller, and release escrow after
              receipt.
            </p>
          </div>
          <button className="back-btn" onClick={onBack}>
            Back to Marketplace
          </button>
        </div>

        <div className="buyer-escrow-grid">
          <div className="buyer-main-stack">
            <article className="buyer-order-summary-card">
              <div className="buyer-order-summary-head">
                <div>
                  <span className="detail-section-label">Order Summary</span>
                  <h3>{itemTitle}</h3>
                </div>
                <span className={`buyer-status-badge ${statusMeta.tone}`}>
                  {statusMeta.label}
                </span>
              </div>

              <div className="buyer-order-summary-body">
                {itemImage ? (
                  <img
                    src={itemImage}
                    alt={itemTitle}
                    className="buyer-order-image"
                  />
                ) : (
                  <div className="buyer-order-image buyer-order-image-empty">
                    No image
                  </div>
                )}

                <div className="buyer-order-details">
                  <div className="buyer-meta-grid">
                    <div className="buyer-meta-item">
                      <span>Seller</span>
                      <strong>{sellerName}</strong>
                    </div>
                    <div className="buyer-meta-item">
                      <span>Delivery Method</span>
                      <strong>{deliveryMethod}</strong>
                    </div>
                    <div className="buyer-meta-item">
                      <span>Current Status</span>
                      <strong>{statusMeta.label}</strong>
                    </div>
                    <div className="buyer-meta-item">
                      <span>Buyer</span>
                      <strong>{buyerName}</strong>
                    </div>
                  </div>

                  <div className="buyer-delivery-box">
                    <div className="buyer-section-icon" aria-hidden="true">
                      D
                    </div>
                    <div>
                      <span className="detail-meta-label">
                        Delivery Details
                      </span>
                      <p>{deliveryDetails}</p>
                    </div>
                  </div>
                </div>

                <aside className="buyer-karma-lock">
                  <span className="buyer-section-icon" aria-hidden="true">
                    K
                  </span>
                  <div>
                    <span>Locked Karma Points</span>
                    <strong>{lockedKarma}</strong>
                  </div>
                </aside>
              </div>
            </article>

            <article className="buyer-progress-card">
              <div className="buyer-card-heading">
                <span className="detail-section-label">Order Progress</span>
                <strong>{statusMeta.label}</strong>
              </div>
              <div className="buyer-progress-track">
                {STAGES.map((stage, index) => (
                  <div
                    key={stage.key}
                    className={`buyer-progress-step ${index <= stageIndex ? "active" : ""}`}
                  >
                    <span>{index + 1}</span>
                    <strong>{stage.label}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="checkout-card buyer-chat-card">
              <OrderChat
                orderId={escrowId}
                itemId={itemId}
                buyerId={buyerId}
                sellerId={sellerId}
                buyerName={buyerName}
                sellerName={sellerName}
                currentUserRole="buyer"
                currentUserName={buyerName}
              />
            </article>
          </div>

          <aside className="buyer-side-stack">
            <article className="buyer-countdown-card">
              <div className="buyer-countdown-top">
                <div className="buyer-section-icon" aria-hidden="true">
                  T
                </div>
                <span className="detail-section-label">48-Hour Rule</span>
              </div>
              <strong>{formatCountdown(remainingSeconds)}</strong>
              <p>
                Funds will be automatically released to the seller after 48
                hours if no issue is reported.
              </p>
              <span className="buyer-countdown-note">
                Timer is based on the escrow release time returned by the escrow
                API.
              </span>
            </article>

            <article className="buyer-party-card">
              <span className="detail-section-label">Participants</span>
              <div className="buyer-party-row">
                <span className="buyer-avatar">
                  {getInitial(buyerName, "B")}
                </span>
                <div>
                  <strong>Buyer</strong>
                  <p>{buyerName}</p>
                </div>
              </div>
              <div className="buyer-party-row">
                <span className="buyer-avatar seller">
                  {getInitial(sellerName, "S")}
                </span>
                <div>
                  <strong>Seller</strong>
                  <p>{sellerName}</p>
                </div>
              </div>
            </article>

            <article className="buyer-confirm-card">
              <span className="detail-section-label">Receipt</span>
              <h3>Confirm when everything checks out.</h3>
              <p>Confirming releases the locked Karma to the seller.</p>

              {error ? <div className="error-message">{error}</div> : null}
              {success ? (
                <div className="success-message">
                  Receipt confirmed. Escrow funds have been released.
                </div>
              ) : null}

              <button
                className="btn-primary"
                disabled={!canConfirm || confirming || success}
                onClick={handleConfirmReceipt}
              >
                {confirming
                  ? "Confirming..."
                  : success
                    ? "Confirmed"
                    : "Confirm Receipt"}
              </button>
              {canConfirm && onDispute && (
                <button
                  className="btn-tertiary"
                  style={{ marginTop: "0.5rem" }}
                  onClick={() => navigate(`/dispute/${escrowId}`)}
                >
                  Report a Problem
                </button>
              )}
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
