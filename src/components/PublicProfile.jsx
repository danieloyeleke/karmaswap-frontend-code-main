import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import TrustBadge from "./TrustBadge";
import { MapPin } from "lucide-react";

const getErrorMessage = (err) =>
  err?.response?.data?.message ||
  err?.response?.data ||
  err?.response?.data?.error ||
  err?.message ||
  "Request failed";

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { profile: myProfile, user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile =
    myProfile?.username === username || user?.username === username;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/profile/${username}`);
      setProfile(res.data);
      setFollowing(res.data.following ?? false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic

    try {
      if (wasFollowing) {
        await api.delete(`/social/unfollow/${profile.id}`);
        setProfile((p) => ({
          ...p,
          followerCount: (p.followerCount ?? 1) - 1,
        }));
      } else {
        await api.post(`/social/follow/${profile.id}`);
        setProfile((p) => ({
          ...p,
          followerCount: (p.followerCount ?? 0) + 1,
        }));
      }
    } catch {
      setFollowing(wasFollowing); // revert
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading)
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );

  if (error || !profile)
    return (
      <div className="trade-detail-error">
        <p>{error || "Profile not found."}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );

  const availableListings = (profile.listings ?? []).filter(
    (item) => String(item.status || "").toUpperCase() === "AVAILABLE",
  );

  return (
    <div className="public-profile-page">
      <div className="public-profile-shell">
        <button
          className="back-btn detail-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* ── Header Card ── */}
        <div className="public-profile-header-card">
          <div className="public-profile-header-top">
            {/* Avatar */}
            <div className="pp-avatar-wrap">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="pp-avatar-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="pp-avatar-placeholder"
                style={{ display: profile.avatarUrl ? "none" : "flex" }}
              >
                {(profile.username || "U").charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="public-profile-info">
              <div className="public-profile-name-row">
                <div>
                  <h1 className="public-profile-username">
                    {profile.username}
                  </h1>
                  {profile.fullName && (
                    <p className="public-profile-fullname">
                      {profile.fullName}
                    </p>
                  )}
                </div>
                {!isOwnProfile && user && (
                  <button
                    className={`pp-follow-btn ${following ? "following" : ""}`}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? "..."
                      : following
                        ? "Following"
                        : "+ Follow"}
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => navigate("/profile")}
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {profile.location && (
                <p className="profile-location">
                  <MapPin size={13} strokeWidth={2.5} /> {profile.location}
                </p>
              )}
              {profile.bio && (
                <p className="public-profile-bio">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="public-profile-stats">
            <div className="public-stat">
              <span className="public-stat-value">
                {profile.trustScore ?? 0}
              </span>
              <span className="public-stat-label">Trust Score</span>
            </div>
            {profile.trustBadge &&
              profile.trustBadge.toLowerCase() !== "unverified" && (
                <div className="public-stat">
                  <TrustBadge level={profile.trustBadge.toLowerCase()} />
                </div>
              )}
            <div className="public-stat">
              <span className="public-stat-value">
                {profile.followerCount ?? 0}
              </span>
              <span className="public-stat-label">Followers</span>
            </div>
            <div className="public-stat">
              <span className="public-stat-value">
                {profile.followingCount ?? 0}
              </span>
              <span className="public-stat-label">Following</span>
            </div>
            <div className="public-stat">
              <span className="public-stat-value">
                {availableListings.length}
              </span>
              <span className="public-stat-label">Listings</span>
            </div>
          </div>
        </div>

        {/* ── Listings ── */}
        <div className="public-profile-listings-section">
          <h2 className="public-profile-section-title">
            Active Listings
            <span className="public-profile-count">
              {availableListings.length}
            </span>
          </h2>

          {availableListings.length === 0 ? (
            <div className="trades-empty">
              <p>No active listings.</p>
              <span>{profile.username} hasn't listed anything yet.</span>
            </div>
          ) : (
            <div className="pp-listings-grid">
              {availableListings.map((item) => (
                <div
                  key={item.id}
                  className="pp-listing-card"
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="pp-listing-image"
                    />
                  ) : (
                    <div className="pp-listing-image pp-listing-image--empty">
                      No image
                    </div>
                  )}
                  <div className="pp-listing-body">
                    <h4 className="pp-listing-title">{item.title}</h4>
                    <p className="pp-listing-meta">
                      {item.category} · {item.condition}
                    </p>
                    <span className="pp-listing-karma">
                      ✨ {item.karmaValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
