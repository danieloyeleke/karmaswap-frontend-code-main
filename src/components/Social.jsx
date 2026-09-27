import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { getItemById } from "../api/items";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Social.css";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getUserLabel = (user) =>
  user?.username || user?.name || user?.fullName || user?.email || "User";

const getUserInitial = (user) => getUserLabel(user).charAt(0).toUpperCase();

const formatTime = (value) => {
  if (!value) return "Recently";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const activityIcon = (type) => {
  switch (String(type || "").toUpperCase()) {
    case "NEW_LISTING":
      return "📦";
    case "TRADE_COMPLETED":
      return "✅";
    case "TRADE_ONGOING":
      return "🔄";
    case "TRADE_PENDING":
      return "⏳";
    case "TRADE_CANCELLED":
      return "❌";
    default:
      return "✨";
  }
};

const activityLabel = (type) => {
  switch (String(type || "").toUpperCase()) {
    case "NEW_LISTING":
      return "New listing";
    case "TRADE_COMPLETED":
      return "Trade completed";
    case "TRADE_ONGOING":
      return "Trade ongoing";
    case "TRADE_PENDING":
      return "Trade pending";
    case "TRADE_CANCELLED":
      return "Trade cancelled";
    default:
      return "Activity";
  }
};

const activityBadgeClass = (type) => {
  switch (String(type || "").toUpperCase()) {
    case "NEW_LISTING":
      return "social-badge-listing";
    case "TRADE_COMPLETED":
      return "social-badge-complete";
    case "TRADE_ONGOING":
      return "social-badge-ongoing";
    case "TRADE_PENDING":
      return "social-badge-pending";
    case "TRADE_CANCELLED":
      return "social-badge-cancelled";
    default:
      return "social-badge-listing";
  }
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_FEED = [
  {
    id: "f1",
    activityType: "NEW_LISTING",
    user: { id: "u1", username: "Tunde_Lagos", location: "Lagos" },
    item: {
      id: "i1",
      title: "iPhone 12 — Good condition",
      category: "Electronics",
      karmaValue: 850,
      imageUrl: "",
    },
    description: "listed a new item",
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "f2",
    activityType: "TRADE_COMPLETED",
    user: { id: "u2", username: "Amaka_Abuja", location: "Abuja" },
    item: {
      id: "i2",
      title: "Study Desk",
      category: "Furniture",
      karmaValue: 300,
      imageUrl: "",
    },
    description: "Swapped Blender for Study Desk · 5-star swap",
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    id: "f3",
    activityType: "TRADE_ONGOING",
    user: { id: "u3", username: "Kemi_PH", location: "Port Harcourt" },
    item: {
      id: "i3",
      title: "Office Chair — Like New",
      category: "Home & Kitchen",
      karmaValue: 320,
      imageUrl: "",
    },
    description: "listed a new item",
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "f4",
    activityType: "TRADE_PENDING",
    user: { id: "u4", username: "Bolu_Ibadan", location: "Ibadan" },
    item: {
      id: "i4",
      title: "Samsung Galaxy Tab",
      category: "Electronics",
      karmaValue: 600,
      imageUrl: "",
    },
    description: "has a pending trade",
    createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
  },
  {
    id: "f5",
    activityType: "TRADE_COMPLETED",
    user: { id: "u1", username: "Tunde_Lagos", location: "Lagos" },
    item: {
      id: "i5",
      title: "Nike Air Max",
      category: "Clothing",
      karmaValue: 450,
      imageUrl: "",
    },
    description: "completed a trade successfully",
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
  },
];

const MOCK_LEADERBOARD = [
  {
    rank: 1,
    user: {
      id: "u1",
      username: "Tunde_Lagos",
      location: "Lagos",
      trustBadge: "Gold",
    },
    tradeCount: 47,
    karmaEarned: 2400,
  },
  {
    rank: 2,
    user: {
      id: "u2",
      username: "Amaka_Abuja",
      location: "Abuja",
      trustBadge: "Gold",
    },
    tradeCount: 39,
    karmaEarned: 1900,
  },
  {
    rank: 3,
    user: {
      id: "u3",
      username: "Kemi_PH",
      location: "Port Harcourt",
      trustBadge: "Silver",
    },
    tradeCount: 31,
    karmaEarned: 1500,
  },
  {
    rank: 4,
    user: {
      id: "u4",
      username: "Bolu_Ibadan",
      location: "Ibadan",
      trustBadge: "Silver",
    },
    tradeCount: 28,
    karmaEarned: 1200,
  },
  {
    rank: 5,
    user: {
      id: "u5",
      username: "Seun_Kano",
      location: "Kano",
      trustBadge: "Bronze",
    },
    tradeCount: 22,
    karmaEarned: 980,
  },
];

const MOCK_SUGGESTIONS = [
  {
    user: {
      id: "u6",
      username: "Chidi_Enugu",
      location: "Enugu",
      trustBadge: "Silver",
    },
    tradeCount: 22,
  },
  {
    user: {
      id: "u7",
      username: "Fatima_Kano",
      location: "Kano",
      trustBadge: "Bronze",
    },
    tradeCount: 18,
  },
  {
    user: {
      id: "u8",
      username: "Emeka_Lagos",
      location: "Lagos",
      trustBadge: "Bronze",
    },
    tradeCount: 15,
  },
];

const rankMedal = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const formatKarma = (value) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
};

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = "md" }) {
  const initial = getUserInitial(user);
  const colors = [
    "#2d7a3e",
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#d97706",
    "#059669",
  ];
  const color = colors[(initial.charCodeAt(0) || 0) % colors.length];
  const sizes = {
    sm: "social-avatar-sm",
    md: "social-avatar-md",
    lg: "social-avatar-lg",
  };

  return (
    <div
      className={`social-avatar ${sizes[size]}`}
      style={{ background: color }}
    >
      {initial}
    </div>
  );
}

// ─── FEED ITEM ICON (with broken-image fallback) ────────────────────────────

function FeedItemIcon({ item, icon = "📦" }) {
  const [broken, setBroken] = useState(false);
  if (item?.imageUrl && !broken) {
    return (
      <img
        src={item.imageUrl}
        alt={item.title || "Item"}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span role="img" aria-label="item">
      {icon}
    </span>
  );
}

// ─── FEED CARD ───────────────────────────────────────────────────────────────

function FeedCard({ activity, onItemClick }) {
  const icon = activityIcon(activity.activityType);
  const label = activityLabel(activity.activityType);
  const badgeClass = activityBadgeClass(activity.activityType);
  const hasItem = activity.item?.title;
  const navigate = useNavigate();

  // Parse item name from description as fallback
  const parsedItemName = (() => {
    const desc = activity.description || "";
    const match = desc.match(/:\s*(.+)$/);
    return match ? match[1].trim() : null;
  })();

  const handleUserClick = () => {
    const username = activity.user?.username || getUserLabel(activity.user);
    navigate(`/profile/${username}`);
  };

  return (
    <div className="social-feed-card">
      <div className="social-feed-header">
        <span onClick={handleUserClick} style={{ cursor: "pointer" }}>
          <Avatar user={activity.user} size="md" />
        </span>
        <div className="social-feed-meta">
          <div
            className="social-feed-user clickable-username-inline"
            onClick={handleUserClick}
          >
            <strong>{getUserLabel(activity.user)}</strong>
            {activity.user?.location && (
              <span className="social-feed-location">
                · {activity.user.location}
              </span>
            )}
          </div>
          <span className="social-feed-time">
            {formatTime(activity.createdAt)}
          </span>
        </div>
        <span className={`social-activity-badge ${badgeClass}`}>
          {icon} {label}
        </span>
      </div>
      {(hasItem || parsedItemName) && (
        <div
          className={`social-feed-item ${hasItem ? "social-feed-item-clickable" : ""}`}
          onClick={hasItem ? () => onItemClick?.(activity.item.id) : undefined}
          role={hasItem ? "button" : undefined}
          tabIndex={hasItem ? 0 : undefined}
        >
          <div className="social-feed-item-icon">
            <FeedItemIcon item={activity.item} icon={icon} />
          </div>
          <div className="social-feed-item-info">
            <strong>{activity.item?.title || parsedItemName}</strong>
            {(activity.item?.category || activity.item?.karmaValue) && (
              <span>
                {activity.item?.category}
                {activity.item?.category && activity.item?.karmaValue
                  ? " · "
                  : ""}
                {activity.item?.karmaValue
                  ? `✨ ${activity.item.karmaValue} Karma`
                  : ""}
              </span>
            )}
          </div>
          {hasItem && <span className="social-feed-item-arrow">→</span>}
        </div>
      )}
      {activity.description && !parsedItemName && !hasItem && (
        <p className="social-feed-description">{activity.description}</p>
      )}
      {activity.description && !parsedItemName && (
        <p className="social-feed-description">{activity.description}</p>
      )}
    </div>
  );
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

function Leaderboard({
  traders,
  followingIds,
  onFollow,
  onUnfollow,
  actionLoadingId,
}) {
  const navigate = useNavigate();

  const trustBadgeColor = (badge) => {
    switch (String(badge || "").toLowerCase()) {
      case "platinum":
        return "#7c3aed";
      case "gold":
        return "#d97706";
      case "silver":
        return "#64748b";
      case "bronze":
        return "#b45309";
      default:
        return "#9ca3af";
    }
  };

  return (
    <div className="social-panel">
      <div className="social-panel-head">
        <h3>🏆 Top Traders</h3>
        <span className="social-panel-label">Nigeria</span>
      </div>
      <div className="social-leaderboard">
        {traders.map((entry) => {
          const userId = entry.user?.id;
          const isFollowing = followingIds.has(String(userId));
          const isBusy = actionLoadingId === String(userId);

          const handleUserClick = () => {
            const username = entry.user?.username || getUserLabel(entry.user);
            navigate(`/profile/${username}`);
          };

          return (
            <div
              key={`${entry.rank}-${userId || entry.isCurrentUser}`}
              className={`social-leaderboard-row ${entry.rank <= 3 ? "top-three" : ""} ${entry.isCurrentUser ? "current-user" : ""}`}
            >
              <span className="social-leaderboard-rank">
                {rankMedal(entry.rank)}
              </span>
              <span onClick={handleUserClick} style={{ cursor: "pointer" }}>
                <Avatar user={entry.user} size="sm" />
              </span>
              <div className="social-leaderboard-info">
                <div
                  className="social-leaderboard-name clickable-username-inline"
                  onClick={handleUserClick}
                >
                  <strong>{getUserLabel(entry.user)}</strong>
                  {entry.isCurrentUser && (
                    <span className="social-you-badge">You</span>
                  )}
                </div>
                <span>{entry.tradeCount} trades</span>
                {entry.followerCount > 0 && (
                  <span>{entry.followerCount} followers</span>
                )}
                {entry.user?.location && <span>{entry.user.location}</span>}
              </div>
              <div className="social-leaderboard-right">
                <span className="social-karma-chip">
                  {/* ✨ {formatKarma(entry.trustScore)} */}
                </span>
                {!entry.isCurrentUser && (
                  <button
                    className={`social-follow-btn ${isFollowing ? "following" : ""}`}
                    onClick={() =>
                      isFollowing ? onUnfollow(userId) : onFollow(userId)
                    }
                    disabled={isBusy}
                  >
                    {isBusy ? "..." : isFollowing ? "Following" : "+ Follow"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SUGGESTED TRADERS ───────────────────────────────────────────────────────
function SuggestedTraders({
  suggestions,
  followingIds,
  onFollow,
  actionLoadingId,
  onViewMore,
}) {
  return (
    <div className="social-panel">
      <div className="social-panel-head">
        <h3>👥 Suggested Traders</h3>
      </div>
      <div className="social-suggestions">
        {suggestions.map((entry, idx) => {
          const userId = entry.user?.id;
          const isFollowing = followingIds.has(String(userId));
          const isBusy = actionLoadingId === String(userId);

          return (
            <div key={userId || idx} className="social-suggestion-row">
              <Avatar user={entry.user} size="sm" />
              <div className="social-suggestion-info">
                <strong>{getUserLabel(entry.user)}</strong>
                <span>
                  {entry.tradeCount} trades
                  {entry.user?.followerCount > 0 &&
                    ` · ${entry.user.followerCount} followers`}
                  {entry.user?.location && ` · ${entry.user.location}`}
                </span>
              </div>
              <button
                className={`social-follow-btn ${isFollowing ? "following" : ""}`}
                onClick={() => onFollow(userId)}
                disabled={isBusy || isFollowing}
              >
                {isBusy ? "..." : isFollowing ? "✓" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
      {onViewMore && (
        <button className="social-view-more-btn" onClick={onViewMore}>
          More suggestions →
        </button>
      )}
    </div>
  );
}

// ─── COMMUNITY STATS ─────────────────────────────────────────────────────────

function CommunityStats({ followingCount, followerCount }) {
  return (
    <div className="social-stats-card">
      <h3>Your Network</h3>
      <p>Keep trading to grow your community</p>
      <div className="social-stats-grid">
        <div className="social-stat">
          <strong>{followingCount}</strong>
          <span>Following</span>
        </div>
        <div className="social-stat">
          <strong>{followerCount}</strong>
          <span>Followers</span>
        </div>
      </div>
    </div>
  );
}

// ─── USER LIST CARD ──────────────────────────────────────────────────────────

function UserListCard({
  user,
  isFollowing,
  onFollow,
  onUnfollow,
  actionLoadingId,
  showFollowBack = false,
}) {
  const userId = user?.id ?? user?.userId ?? user?.accountId;
  const isBusy = actionLoadingId === String(userId);

  return (
    <div className="social-user-card">
      <Avatar user={user} size="md" />
      <div className="social-user-info">
        <strong>{getUserLabel(user)}</strong>
        <span>{user?.location || "KarmaSwap trader"}</span>
      </div>
      {isFollowing ? (
        <button
          className="social-unfollow-btn"
          onClick={() => onUnfollow(userId)}
          disabled={isBusy}
        >
          {isBusy ? "..." : "Unfollow"}
        </button>
      ) : (
        <button
          className="social-follow-btn"
          onClick={() => onFollow(userId)}
          disabled={isBusy}
        >
          {isBusy ? "..." : showFollowBack ? "Follow Back" : "Follow"}
        </button>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Social({ onItemClick }) {
  const { profile } = useAuth();

  const [feed, setFeed] = useState(MOCK_FEED);
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERBOARD);
  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("feed");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const profileId = profile?.id || profile?.accountId;
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      const [
        feedRes,
        followingRes,
        followersRes,
        suggestionsRes,
        leaderboardRes,
      ] = await Promise.allSettled([
        api.get("/social/feed"),
        api.get("/social/following"),
        api.get("/social/followers"),
        api.get("/social/suggestions"),
        api.get("/social/traders/top?limit=5"),
      ]);

      // ✅ Feed — map flat API shape into the nested shape FeedCard expects
      if (feedRes.status === "fulfilled") {
        // console.log("Feed response:", JSON.stringify(feedRes.value.data));
        const feedData = normalizeList(feedRes.value.data);
        if (feedData.length > 0) {
          setFeed(
            feedData.map((item) => ({
              id: item.id,
              activityType: item.activityType,
              description: item.description,
              createdAt: item.createdAt,
              user: {
                id: item.userId,
                username: item.username,
                location: item.location,
              },
              item: item.itemId
                ? {
                    id: item.itemId,
                    title: item.itemTitle,
                    category: item.itemCategory,
                    karmaValue: item.itemKarmaValue,
                    imageUrl: item.itemImageUrl,
                  }
                : null,
            })),
          );
        }
      }

      // Leaderboard — own variable, no shadowing
      if (leaderboardRes.status === "fulfilled") {
        const leaderboardData = normalizeList(leaderboardRes.value.data);
        if (leaderboardData.length > 0) {
          setLeaderboard(
            leaderboardData.map((entry) => ({
              rank: entry.rank,
              isCurrentUser:
                entry.isCurrentUser ||
                String(entry.userId) === String(profileId),
              user: {
                id: entry.userId,
                username: entry.username,
                location: entry.location,
                trustBadge: entry.trustBadge,
                trustScore: entry.trustScore,
              },
              tradeCount: entry.tradeCount,
              karmaEarned: entry.karmaEarned,
              followerCount: entry.followerCount,
            })),
          );
        }
      }

      if (followersRes.status === "fulfilled") {
        const followersData = normalizeList(followersRes.value.data);
        setFollowers(followersData);
      }

      if (suggestionsRes.status === "fulfilled") {
        const suggestionsData = normalizeList(suggestionsRes.value.data);
        if (suggestionsData.length > 0)
          setSuggestions(
            suggestionsData.map((u) => ({
              user: u,
              tradeCount: u.tradeCount ?? 0,
            })),
          );
      }

      // Added for error handling and debugging
      if (followingRes.status === "fulfilled") {
        console.log(
          "Following raw response:",
          JSON.stringify(followingRes.value.data),
        );
        const data = normalizeList(followingRes.value.data);
        console.log("Following normalized:", data);
        setFollowing(data);
        setFollowingIds(
          new Set(data.map((u) => String(u?.id ?? u?.userId ?? u?.accountId))),
        );
      }
    } catch (err) {
      console.error("Social fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialData();
  }, []);

  const handleFollow = async (userId) => {
    if (!userId) return;
    setActionLoadingId(String(userId));
    setFollowingIds((prev) => new Set([...prev, String(userId)]));

    try {
      await api.post(`/social/follow/${userId}`);
      await fetchSocialData();
    } catch (err) {
      console.error("Follow error:", err);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    } finally {
      setActionLoadingId("");
    }
  };

  const handleUnfollow = async (userId) => {
    if (!userId) return;
    setActionLoadingId(String(userId));
    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.delete(String(userId));
      return next;
    });

    try {
      await api.delete(`/social/unfollow/${userId}`);
      await fetchSocialData();
    } catch (err) {
      console.error("Unfollow error:", err);
      setFollowingIds((prev) => new Set([...prev, String(userId)]));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleFeedItemClick = async (itemId) => {
    if (!itemId) return;
    try {
      const item = await getItemById(itemId);
      const status = String(item?.status || "").toUpperCase();

      if (item && status === "AVAILABLE") {
        onItemClick?.(item);
      } else {
        setToast(
          "This item is no longer available — only active marketplace listings can be viewed.",
        );
      }
    } catch (err) {
      console.error("Failed to load item:", err);
      setToast(
        "This item is no longer available — only active marketplace listings can be viewed.",
      );
    }
  };

  const tabs = [
    { id: "feed", label: "Feed" },
    { id: "following", label: `Following (${following.length})` },
    { id: "followers", label: `Followers (${followers.length})` },
    { id: "discover", label: "Discover" },
  ];

  return (
    <div className="social-page-wrapper">
      {toast && <div className="social-toast">{toast}</div>}
      <div className="social-page-header">
        <div>
          <h2>Social</h2>
          <p>Traders across Nigeria</p>
        </div>
        <div className="social-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`social-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="social-body">
        {/* Left — Main content */}
        <div className="social-main">
          {/* FEED TAB */}
          {activeTab === "feed" && (
            <div className="social-feed">
              {loading ? (
                <div className="social-loading">Loading feed...</div>
              ) : feed.length === 0 ? (
                <div className="social-empty">
                  <p>No activity yet.</p>
                  <span>Follow traders to see their updates here.</span>
                </div>
              ) : (
                feed.map((activity) => (
                  <FeedCard
                    key={activity.id}
                    activity={activity}
                    onItemClick={handleFeedItemClick} // ← add this
                  />
                ))
              )}
            </div>
          )}

          {/* FOLLOWING TAB */}
          {activeTab === "following" && (
            <div className="social-user-list">
              {following.length === 0 ? (
                <div className="social-empty">
                  <p>You are not following anyone yet.</p>
                  <span>
                    Discover traders and follow them to see their activity.
                  </span>
                </div>
              ) : (
                following.map((user, idx) => (
                  <UserListCard
                    key={user?.id ?? idx}
                    user={user}
                    isFollowing={true}
                    onUnfollow={handleUnfollow}
                    onFollow={handleFollow}
                    actionLoadingId={actionLoadingId}
                  />
                ))
              )}
            </div>
          )}

          {/* FOLLOWERS TAB */}
          {activeTab === "followers" && (
            <div className="social-user-list">
              {followers.length === 0 ? (
                <div className="social-empty">
                  <p>No followers yet.</p>
                  <span>Keep trading and listing to grow your audience.</span>
                </div>
              ) : (
                followers.map((user, idx) => {
                  const userId = user?.id ?? user?.userId ?? user?.accountId;
                  return (
                    <UserListCard
                      key={userId ?? idx}
                      user={user}
                      isFollowing={followingIds.has(String(userId))}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      actionLoadingId={actionLoadingId}
                      showFollowBack={true}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* DISCOVER TAB */}
          {activeTab === "discover" && (
            <div className="social-user-list">
              {suggestions.length === 0 ? (
                <div className="social-empty">
                  <p>No suggestions available right now.</p>
                </div>
              ) : (
                suggestions.map((entry, idx) => (
                  <UserListCard
                    key={entry.user?.id ?? idx}
                    user={entry.user}
                    isFollowing={followingIds.has(String(entry.user?.id))}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    actionLoadingId={actionLoadingId}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="social-sidebar">
          <CommunityStats
            followingCount={following.length || profile?.followingCount || 0}
            followerCount={followers.length || profile?.followerCount || 0}
          />
          <Leaderboard
            traders={leaderboard}
            followingIds={followingIds}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            actionLoadingId={actionLoadingId}
          />
          <SuggestedTraders
            suggestions={suggestions.slice(0, 5)}
            followingIds={followingIds}
            onFollow={handleFollow}
            actionLoadingId={actionLoadingId}
            onViewMore={() => setActiveTab("discover")}
          />
        </div>
      </div>
    </div>
  );
}
