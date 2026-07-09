import React, { useState } from "react";
import TrustBadge from "./TrustBadge";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

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

const formatCondition = (condition) => {
  const map = {
    new: "New",
    like_new: "Like New",
    good: "Good",
    fair: "Fair",
  };
  return map[condition?.toLowerCase()] || condition;
};

export default function ItemCard({
  item,
  onClick,
  canAfford,
  isOwnItem,
  isFollowing,
  onFollow,
  karmaBalance,
}) {
  const navigate = useNavigate();

  const handleProfileClick = (e) => {
    e.stopPropagation(); // prevents the card's onClick from firing
    navigate(`/profile/${item.owner?.username || ownerName}`);
  };

  const handleFollow = (e) => {
    e.stopPropagation();
    onFollow?.();
  };

  const imageUrl = item.imageUrl || item.image_url;
  const karmaValue = item.karmaValue ?? item.karma_value ?? 0;
  const ownerName =
    item.owner?.fullName ||
    item.owner?.full_name ||
    item.owner?.username ||
    item.ownerName ||
    item.owner_name ||
    item.ownerUsername ||
    item.owner_username ||
    item.user?.fullName ||
    item.user?.full_name ||
    item.user?.username ||
    // item.ownerEmail ||
    // item.owner_email ||
    "Unknown owner";
  const trustLevel = getTrustLevel(item);

  return (
    <div
      className={`item-card ${!canAfford && !isOwnItem ? "locked" : ""} ${isOwnItem ? "own-listing" : ""}`}
      onClick={() => !isOwnItem && onClick(item)}
    >
      <div className="item-image">
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} />
        ) : (
          <div className="no-image">📦</div>
        )}
        <span className="item-condition">
          {formatCondition(item.condition)}
        </span>
        <div className="item-trust-badge">
          {trustLevel !== "unverified" && <TrustBadge level={trustLevel} />}
        </div>
        {/* Lock overlay */}
        {!canAfford && !isOwnItem && (
          <div className="item-lock-overlay">
            <span className="item-lock-icon">🔒</span>
            <span className="item-lock-text">
              Need {(item.karmaValue ?? 0) - karmaBalance} more karma
            </span>
          </div>
        )}
      </div>

      <div className="item-info">
        <h3 className="item-title">{item.title}</h3>
        <p className="item-category">{item.category}</p>

        <div className="item-owner">
          <div
            className="item-owner-details clickable-user"
            onClick={handleProfileClick}
          >
            {/* {item.owner?.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={ownerName}
                className="clickable-user-avatar"
              />
            ) : (
              <div className="clickable-user-avatar clickable-user-avatar--placeholder">
                {(ownerName || "U").charAt(0).toUpperCase()}
              </div>
            )} */}
            <div className="owner-text-stack">
              <span className="owner-name">{ownerName}</span>
              {(item.ownerLocation || item.owner?.location) && (
                <span className="owner-location">
                  📍 {item.ownerLocation || item.owner?.location}
                </span>
              )}
            </div>
          </div>

          {!isOwnItem && item.owner?.id && (
            <button
              className={`follow-btn ${isFollowing ? "following" : ""}`}
              onClick={(e) => {
                e.stopPropagation(); // also stop this — it's already separate but confirm it's protected
                handleFollow(e);
              }}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        <div className="item-footer">
          {isOwnItem ? (
            <span className="own-listing-badge">Your Listing</span>
          ) : (
            <div className={`item-karma ${!canAfford ? "insufficient" : ""}`}>
              <span style={{ opacity: !canAfford ? 0.4 : 1 }}>
                ✨ {karmaValue}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
