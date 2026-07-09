import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import { deleteItem, updateItem } from "../api/items";
import DailyRewards from "./DailyRewards";
import { MapPin } from "lucide-react";
import {
  NIGERIA_STATES,
  buildLocation,
  parseLocation,
} from "../utils/nigeriaLocations";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Clothing",
  "Books",
  "Electronics",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Toys & Games",
  "Arts & Crafts",
  "Tools",
  "Furniture",
  "Other",
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getErrorMessage = (err) =>
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  "Request failed";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};


// ─── EDIT PROFILE MODAL ──────────────────────────────────────────────────────

function EditProfileModal({ profile, onClose, onSaved }) {
  const loc = parseLocation(profile?.location);
  const selectedStateData = NIGERIA_STATES.find((s) => s.name === loc.state);

  const [form, setForm] = useState({
    username: profile?.username || "",
    fullName: profile?.fullName || profile?.full_name || "",
    bio: profile?.bio || "",
    state: loc.state || "",
    city: loc.city || "",
    area: loc.area || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatarUrl || null,
  );
  const [cities, setCities] = useState(selectedStateData?.cities || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "state") {
      const stateData = NIGERIA_STATES.find((s) => s.name === value);
      setCities(stateData?.cities || []);
      setForm((prev) => ({ ...prev, state: value, city: "" }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const location = buildLocation(form.city, form.state, form.area);

      const formData = new FormData();
      formData.append("username", form.username.trim());
      formData.append("fullName", form.fullName.trim());
      formData.append("bio", form.bio.trim());
      formData.append("location", location);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await api.put("/profile/me", formData);
      onSaved(res.data);
    } catch (err) {
      if (err?.response?.status === 409) {
        setError("Username already taken. Please choose another.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal profile-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header profile-edit-modal-header">
          <h3>Edit Profile</h3>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
          >
            &times;
          </button>
        </div>

        <form className="profile-edit-modal-body" onSubmit={handleSubmit}>
          {/* Avatar upload */}
          <div className="profile-edit-avatar-section">
            <div
              className="profile-edit-avatar"
              onClick={() => fileRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" />
              ) : (
                <span>{(form.username || "U").charAt(0).toUpperCase()}</span>
              )}
              <div className="profile-edit-avatar-overlay">📷</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <p className="profile-edit-avatar-hint">Click to change photo</p>
          </div>

          {/* Username */}
          <label className="profile-edit-label">
            Username
            <input
              className="profile-edit-input"
              value={form.username}
              onChange={(e) => handleField("username", e.target.value)}
              placeholder="Your username"
              disabled={submitting}
            />
          </label>

          {/* Full Name */}
          <label className="profile-edit-label">
            Full Name
            <input
              className="profile-edit-input"
              value={form.fullName}
              onChange={(e) => handleField("fullName", e.target.value)}
              placeholder="Your full name"
              disabled={submitting}
            />
          </label>

          {/* Bio */}
          <label className="profile-edit-label">
            Bio
            <textarea
              className="profile-edit-input profile-edit-textarea"
              value={form.bio}
              onChange={(e) => handleField("bio", e.target.value)}
              placeholder="Tell traders a bit about yourself..."
              rows={3}
              disabled={submitting}
            />
          </label>

          {/* Location */}
          <div className="profile-edit-label">
            Location
            <div className="profile-edit-location">
              <select
                className="profile-edit-input"
                value={form.state}
                onChange={(e) => handleField("state", e.target.value)}
                disabled={submitting}
              >
                <option value="">Select state</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className="profile-edit-input"
                value={form.city}
                onChange={(e) => handleField("city", e.target.value)}
                disabled={submitting || !form.state}
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="profile-edit-input"
                value={form.area}
                onChange={(e) => handleField("area", e.target.value)}
                placeholder="e.g. Admiralty Way, GRA (optional)"
                disabled={submitting}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="profile-edit-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── REFERRAL CARD ───────────────────────────────────────────────────────────

const APP_ORIGIN = import.meta.env.VITE_APP_URL || window.location.origin;

function ReferralCard({ referralCode }) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${APP_ORIGIN}/register?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on KarmaSwap",
          text: "Trade items, build community. Use my referral link to sign up!",
          url: referralLink,
        });
      } catch {
        // user cancelled share — do nothing
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="referral-card">
      <div className="referral-card-header">
        <div className="referral-card-title-group">
          <span className="referral-card-icon">🎁</span>
          <div>
            <h3 className="referral-card-title">Invite & Earn</h3>
            <p className="referral-card-subtitle">
              Share your link — earn karma when friends join.
            </p>
          </div>
        </div>
        <span className="referral-code-badge">{referralCode}</span>
      </div>

      <div className="referral-link-row">
        <span className="referral-link-text" title={referralLink}>
          {referralLink}
        </span>
        <button className="referral-copy-btn" onClick={handleCopy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button className="referral-share-btn" onClick={handleShare}>
          Share
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Profile({ activeOrder, onOpenOrderTracking }) {
  const { user, profile: authProfile, refreshProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [claimedItems, setClaimedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("my-items");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [itemActionLoading, setItemActionLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    recipientId: "",
    amount: "",
  });
  const [transferError, setTransferError] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [accountIdCopied, setAccountIdCopied] = useState(false);
  const [karmaHistory, setKarmaHistory] = useState([]);
  const [karmaHistoryLoading, setKarmaHistoryLoading] = useState(false);
  const [karmaHistoryError, setKarmaHistoryError] = useState("");

  const resolvedProfile = profile ?? authProfile;

  const currentBalance = toNumber(
    resolvedProfile?.karmaBalance ?? resolvedProfile?.karma_balance ?? 0,
  );
  const transferAmount = toNumber(transferForm.amount, 0);
  const isTransferDisabled =
    transferLoading ||
    transferAmount <= 0 ||
    transferAmount > currentBalance ||
    !transferForm.recipientId.trim();

  const accountId =
    authProfile?.accountId ??
    authProfile?.account_id ??
    authProfile?.id ??
    resolvedProfile?.accountId ??
    resolvedProfile?.id ??
    user?.id ??
    "";

  const buildIdentitySet = (profileData) => {
    const values = [
      user?.id,
      user?.userId,
      user?.email,
      user?.username,
      profileData?.id,
      profileData?.user?.id,
      profileData?.user?.email,
      profileData?.username,
    ];
    return new Set(
      values
        .filter((v) => v != null && String(v).trim() !== "")
        .map((v) => String(v)),
    );
  };

  const isMatch = (value, idSet) => value != null && idSet.has(String(value));

  const isMyItem = (item, idSet) =>
    [
      item?.ownerId,
      item?.owner_id,
      item?.userId,
      item?.ownerEmail,
      item?.owner_email,
      item?.ownerUsername,
      item?.owner?.id,
      item?.owner?.email,
      item?.owner?.username,
    ].some((v) => isMatch(v, idSet));

  const isClaimedByMe = (item, idSet) =>
    [
      item?.claimedBy,
      item?.claimed_by,
      item?.claimedById,
      item?.claimedByEmail,
      item?.claimer?.id,
      item?.claimer?.email,
    ].some((v) => isMatch(v, idSet));

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, itemsRes] = await Promise.allSettled([
        api.get("/profile/me"),
        api.get("/items"),
      ]);

      let resolvedProf = null;

      if (profileRes.status === "fulfilled") {
        resolvedProf = profileRes.value.data;
        setProfile(resolvedProf);
      }

      if (itemsRes.status === "fulfilled") {
        const items = normalizeList(itemsRes.value.data);
        const idSet = buildIdentitySet(resolvedProf);
        const mine = items.filter((i) => isMyItem(i, idSet));
        const claimed = items.filter((i) => isClaimedByMe(i, idSet));
        setMyItems(mine);
        setClaimedItems(claimed);
        // setTransactions(buildActivityEntries(mine, claimed));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchKarmaHistory = useCallback(async () => {
    setKarmaHistoryLoading(true);
    setKarmaHistoryError("");
    try {
      const res = await api.get("/profile/karma/history");
      setKarmaHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setKarmaHistoryError(getErrorMessage(err));
    } finally {
      setKarmaHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeTab === "activity" &&
      karmaHistory.length === 0 &&
      !karmaHistoryLoading
    ) {
      fetchKarmaHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchUserData();
  }, [user, fetchUserData]);

  const handleProfileSaved = async (updatedProfile) => {
    setProfile(updatedProfile);
    setShowEditModal(false);
    await refreshProfile?.();
  };

  const startEditingItem = (item) => {
    setEditingItemId(item.id ?? item._id);
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "Other",
      condition: item.condition || "good",
      karmaValue: item.karmaValue ?? item.karma_value ?? 0,
    });
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditForm(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: field === "karmaValue" ? Number(value) || 0 : value,
    }));
  };

  const handleSaveItem = async (itemId) => {
    if (!editForm?.title?.trim()) {
      setError("Title required.");
      return;
    }
    setItemActionLoading(true);
    try {
      await updateItem(itemId, {
        ...editForm,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
      });
      cancelEditingItem();
      await fetchUserData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setItemActionLoading(true);
    try {
      await deleteItem(itemId);
      if (editingItemId === itemId) cancelEditingItem();
      await fetchUserData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleCopyAccountId = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(String(accountId));
      setAccountIdCopied(true);
      setTimeout(() => setAccountIdCopied(false), 2000);
    } catch {
      setError("Unable to copy account ID.");
    }
  };

  const handleSubmitTransfer = async (e) => {
    e?.preventDefault?.();
    if (!transferForm.recipientId.trim()) {
      setTransferError("Recipient ID required.");
      return;
    }
    if (transferAmount <= 0) {
      setTransferError("Amount must be greater than 0.");
      return;
    }
    if (transferAmount > currentBalance) {
      setTransferError("Amount exceeds available karma.");
      return;
    }
    setTransferLoading(true);
    setTransferError("");
    try {
      await api.post("/karma/transfer", {
        giverId: resolvedProfile?.id ?? user?.id ?? user?.email,
        receiverId: transferForm.recipientId.trim(),
        itemId: null,
        amount: transferAmount,
      });
      setProfile((prev) =>
        prev
          ? { ...prev, karmaBalance: (prev.karmaBalance || 0) - transferAmount }
          : prev,
      );
      await refreshProfile?.();
      setTransferForm({ recipientId: "", amount: "" });
      setShowTransferModal(false);
    } catch (err) {
      setTransferError(getErrorMessage(err));
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading)
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );
  if (!resolvedProfile)
    return (
      <div className="trade-detail-error">
        <p>{error || "Profile not found."}</p>
      </div>
    );

  const API_ORIGIN =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:8080";

  const normalizeUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_ORIGIN}/uploads/${url}`;
  };

  const avatarUrl = resolvedProfile?.avatarUrl;
  const username = resolvedProfile?.username || "User";
  const fullName =
    resolvedProfile?.fullName || resolvedProfile?.full_name || "";
  const bio = resolvedProfile?.bio || "";
  const location = resolvedProfile?.location || "";

  return (
    <div className="profile-page">
      {/* ── Profile Header ── */}
      <div className="profile-header-card">
        <div className="profile-header-top">
          {/* Avatar */}
          <div className="profile-avatar-wrap">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="profile-avatar-placeholder"
              style={{ display: avatarUrl ? "none" : "flex" }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div className="profile-header-info">
            <div className="profile-header-name-row">
              <h1 onClick={() => navigate(`/profile/${username}`)}>
                {username}
              </h1>
              <button
                className="profile-edit-btn"
                onClick={() => setShowEditModal(true)}
              >
                ✏️ Edit Profile
              </button>
              <button
                className="profile-edit-btn profile-transfer-btn"
                onClick={() => setShowTransferModal(true)}
              >
                ✨ Transfer Karma
              </button>
            </div>
            {fullName && <p className="profile-fullname">{fullName}</p>}
            {location && (
              <p className="profile-location">
                <MapPin size={13} strokeWidth={2.5} /> {location}
              </p>
            )}
            {bio && <p className="profile-bio">{bio}</p>}

            {/* Account ID */}
            <div className="profile-account-id">
              <span className="profile-account-id-label">Account ID</span>
              <code title={accountId}>
                {accountId
                  ? `${accountId.slice(0, 8)}...${accountId.slice(-4)}`
                  : "Unavailable"}
              </code>
              <button
                className="profile-account-id-copy"
                onClick={handleCopyAccountId}
                disabled={!accountId}
              >
                {accountIdCopied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats-grid">
          <div className="profile-stat-card primary">
            <div className="profile-stat-value">
              {resolvedProfile?.karmaBalance ?? 0}
            </div>
            <div className="profile-stat-label">Available Karma</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">
              {resolvedProfile?.totalKarmaEarned ??
                resolvedProfile?.total_karma_earned ??
                0}
            </div>
            <div className="profile-stat-label">Total Earned</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">
              {resolvedProfile?.totalKarmaSpent ??
                resolvedProfile?.total_karma_spent ??
                0}
            </div>
            <div className="profile-stat-label">Total Spent</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">
              {resolvedProfile?.trustScore ?? 50}
            </div>
            <div className="profile-stat-label">Trust Score</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">
              {resolvedProfile?.itemsListedCount ?? myItems.length}
            </div>
            <div className="profile-stat-label">Listed</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">
              {resolvedProfile?.itemsClaimedCount ?? claimedItems.length}
            </div>
            <div className="profile-stat-label">Claimed</div>
          </div>
        </div>

        {/* Remove profile-header-actions entirely unless activeOrder exists */}
        {activeOrder && (
          <div className="profile-header-actions">
            <button className="btn-secondary" onClick={onOpenOrderTracking}>
              View Active Order
            </button>
          </div>
        )}
      </div>

      {/* ── Referral Card ── */}
      {resolvedProfile?.referralCode && (
        <ReferralCard referralCode={resolvedProfile.referralCode} />
      )}

      {/* ── Daily Rewards ── */}
      <DailyRewards
        profile={resolvedProfile}
        onRewardsUpdated={async () => {
          await refreshProfile?.();
        }}
      />

      {/* ── Tabs ── */}
      <div className="profile-tabs">
        {[
          { id: "my-items", label: `Listings (${myItems.length})` },
          { id: "claimed", label: `Claimed (${claimedItems.length})` },
          { id: "activity", label: "Activity" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="profile-content">
        {error && <div className="error-message">{error}</div>}

        {activeTab === "my-items" && (
          <div className="items-list">
            {myItems.length === 0 ? (
              <div className="trades-empty">
                <p>No listings yet.</p>
                <span>List an item on the marketplace to get started.</span>
              </div>
            ) : (
              myItems.map((item) => {
                const itemId = item.id ?? item._id ?? item.title;
                const isEditing = editingItemId === itemId;
                const imageUrl = item.imageUrl || item.image_url;

                return (
                  <div
                    key={itemId}
                    className={`item-row ${isEditing ? "editing" : ""}`}
                  >
                    {isEditing ? (
                      /* ── EDIT MODE ── */
                      <div className="item-edit-form">
                        <div className="item-edit-header">
                          <span className="item-edit-title-preview">
                            {item.title}
                          </span>
                          <span className="item-edit-badge">Editing</span>
                        </div>

                        <label className="item-edit-label">
                          Title
                          <input
                            className="item-edit-input"
                            value={editForm?.title ?? ""}
                            onChange={(e) =>
                              handleEditFieldChange("title", e.target.value)
                            }
                            placeholder="Item title"
                          />
                        </label>

                        <label className="item-edit-label">
                          Description
                          <textarea
                            className="item-edit-input item-edit-textarea"
                            value={editForm?.description ?? ""}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Describe your item..."
                            rows="3"
                          />
                        </label>

                        <div className="item-edit-grid">
                          <label className="item-edit-label">
                            Category
                            <select
                              className="item-edit-input"
                              value={editForm?.category ?? "Other"}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "category",
                                  e.target.value,
                                )
                              }
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="item-edit-label">
                            Condition
                            <select
                              className="item-edit-input"
                              value={editForm?.condition ?? "good"}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "condition",
                                  e.target.value,
                                )
                              }
                            >
                              {CONDITIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="item-edit-label">
                            Karma Value
                            <input
                              className="item-edit-input"
                              type="number"
                              min="1"
                              value={editForm?.karmaValue ?? 0}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "karmaValue",
                                  e.target.value,
                                )
                              }
                              placeholder="0"
                            />
                          </label>
                        </div>

                        <div className="item-edit-actions">
                          <button
                            className="btn-secondary btn-small"
                            disabled={itemActionLoading}
                            onClick={cancelEditingItem}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn-primary btn-small"
                            disabled={itemActionLoading}
                            onClick={() => handleSaveItem(itemId)}
                          >
                            {itemActionLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── VIEW MODE ── */
                      <div className="item-row-inner">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="item-row-image"
                          />
                        )}
                        <div className="item-row-body">
                          <div className="item-row-top">
                            <h4 className="item-row-title">{item.title}</h4>
                            <span
                              className={`status-badge status-${(item.status || "").toLowerCase()}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="item-row-meta">
                            {item.category} · {item.condition}
                          </p>
                          <div className="item-row-footer">
                            <span className="item-row-karma">
                              ✨ {item.karmaValue ?? item.karma_value ?? 0}{" "}
                              karma
                            </span>
                            <div className="item-row-actions">
                              <button
                                className="btn-secondary btn-small"
                                disabled={itemActionLoading}
                                onClick={() => startEditingItem(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="item-delete-btn btn-small"
                                disabled={itemActionLoading}
                                onClick={() => handleDeleteItem(itemId)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "claimed" && (
          <div className="items-list">
            {claimedItems.length === 0 ? (
              <div className="trades-empty">
                <p>No claimed items yet.</p>
                <span>Claim items on the marketplace to see them here.</span>
              </div>
            ) : (
              claimedItems.map((item) => (
                <div key={item.id ?? item.title} className="item-row">
                  <img
                    src={item.imageUrl || item.image_url}
                    alt={item.title}
                    className="item-row-image"
                  />
                  <div className="item-row-info">
                    <h4>{item.title}</h4>
                    <p>
                      {item.category} • {item.condition}
                    </p>
                  </div>
                  <span className="status-badge claimed">In Escrow</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="activity-list">
            {karmaHistoryLoading ? (
              <div className="app-loading">
                <div className="loading-spinner" />
                <p>Loading history...</p>
              </div>
            ) : karmaHistoryError ? (
              <div className="error-message">{karmaHistoryError}</div>
            ) : karmaHistory.length === 0 ? (
              <div className="trades-empty">
                <p>No karma activity yet.</p>
                <span>Your karma history will appear here.</span>
              </div>
            ) : (
              karmaHistory.map((entry) => {
                const isEarned = entry.type === "EARNED";
                const hasItem = entry.itemId && entry.itemTitle;

                return (
                  <div key={entry.id} className="activity-item">
                    <div
                      className={`activity-icon-wrap ${isEarned ? "earned" : "spent"}`}
                    >
                      {isEarned ? "↑" : "↓"}
                    </div>

                    <div className="activity-info">
                      {/* Note or item title */}
                      {entry.note ? (
                        <p className="activity-description">{entry.note}</p>
                      ) : hasItem ? (
                        <p className="activity-description">
                          {isEarned ? "Received for" : "Spent on"}{" "}
                          <strong>"{entry.itemTitle}"</strong>
                        </p>
                      ) : (
                        <p className="activity-description">
                          {isEarned ? "Karma earned" : "Karma spent"}
                        </p>
                      )}

                      {/* Counterparty */}
                      {entry.counterparty &&
                        entry.counterparty !== "system" && (
                          <span className="activity-counterparty">
                            {isEarned ? "From" : "To"}: {entry.counterparty}
                          </span>
                        )}
                      {entry.counterparty === "system" && (
                        <span className="activity-counterparty">Karmaswap</span>
                      )}

                      <span className="activity-time">
                        {new Date(entry.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="activity-right">
                      <span
                        className={`activity-karma ${isEarned ? "earned" : "spent"}`}
                      >
                        {isEarned ? "+" : "-"}
                        {entry.amount}
                      </span>
                      <span className="activity-balance">
                        ✨ {entry.runningBalance}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <EditProfileModal
          profile={resolvedProfile}
          onClose={() => setShowEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {/* ── Transfer Modal ── */}
      {showTransferModal && (
        <div
          className="modal-overlay transfer-modal-overlay"
          onClick={() => !transferLoading && setShowTransferModal(false)}
        >
          <div
            className="modal transfer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header transfer-modal-header">
              <div>
                <span className="transfer-modal-eyebrow">Share Karma</span>
                <h3>Transfer Karma</h3>
                <p className="transfer-modal-subtitle">
                  Send karma to another member instantly.
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
                disabled={transferLoading}
              >
                &times;
              </button>
            </div>
            <form
              className="modal-body transfer-modal-body"
              onSubmit={handleSubmitTransfer}
            >
              <div className="transfer-balance-card">
                <span className="transfer-balance-label">
                  Available Balance
                </span>
                <strong>{currentBalance} karma</strong>
              </div>
              <div className="transfer-id-card">
                <span className="transfer-balance-label">Your Account ID</span>
                <code title={accountId}>
                  {accountId
                    ? `${accountId.slice(0, 8)}...${accountId.slice(-4)}`
                    : "Unavailable"}
                </code>
                <small className="transfer-helper-text">
                  Share this ID so others can send you karma.
                </small>
              </div>
              <label className="input-label transfer-input-label">
                Recipient ID
                <input
                  type="text"
                  value={transferForm.recipientId}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      recipientId: e.target.value,
                    }))
                  }
                  placeholder="Enter recipient ID"
                  disabled={transferLoading}
                />
              </label>
              <label className="input-label transfer-input-label">
                Amount
                <div className="input-with-action transfer-input-with-action">
                  <input
                    type="number"
                    min="1"
                    value={transferForm.amount}
                    onChange={(e) =>
                      setTransferForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    placeholder="0"
                    disabled={transferLoading}
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() =>
                      setTransferForm((p) => ({ ...p, amount: currentBalance }))
                    }
                    disabled={transferLoading || currentBalance <= 0}
                  >
                    Max
                  </button>
                </div>
                <small className="transfer-helper-text">
                  Available: {currentBalance} karma
                </small>
              </label>
              {transferError && (
                <div className="error-message">{transferError}</div>
              )}
              <div className="modal-footer transfer-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTransferModal(false)}
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isTransferDisabled}
                >
                  {transferLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
