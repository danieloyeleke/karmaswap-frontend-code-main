import React, { useState } from "react";

export default function TransactionComplete({ order, onBack, onRate }) {
  const [rating, setRating] = useState(order?.sellerRating || 0);

  const handleRate = (value) => {
    setRating(value);
    onRate?.(value);
  };

  return (
    <section className="order-tracking-page">
      <div className="order-tracking-shell">
        <div className="order-tracking-header">
          <div>
            <span className="detail-section-label">Resolution</span>
            <h2>Transaction Complete</h2>
            <p>Success! You released karma to the seller.</p>
          </div>
        </div>

        <div className="checkout-card">
          <div className="tracking-status-card success">
            <strong>Success!</strong>
            <p>
              {order?.lockedKarma} Karma moved from Escrow to the seller&apos;s available
              balance. Thank you for confirming.
            </p>
          </div>

          <div className="rating-row">
            <span className="detail-meta-label">Rate the seller</span>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star ${rating >= star ? "filled" : ""}`}
                  onClick={() => handleRate(star)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="tracking-actions">
            <button className="btn-primary" onClick={onBack}>
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
