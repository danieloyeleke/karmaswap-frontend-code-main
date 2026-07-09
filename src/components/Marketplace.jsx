import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import ItemCard from "./ItemCard";
import { getItems } from "../api/items";
import api from "../api/axios"; // ← uncomment this

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:8080";

const normalizeImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
};

const normalizeItem = (item) => ({
  ...item,
  imageUrl: normalizeImageUrl(item.imageUrl || item.image_url),
  karmaValue: item.karmaValue != null ? item.karmaValue : item.karma_value,
  escrowId: item.escrowId ?? item.escrow_id,
});

export default function Marketplace({ onItemClick, refreshKey = 0 }) {
  const { profile, user } = useAuth();
  const karmaBalance =
    profile?.karma_balance ?? profile?.karmaBalance ?? user?.karma_balance ?? 0;

  const isOwnItem = (item) => {
    const profileId = profile?.id ?? profile?.accountId;
    if (!profileId) return false;
    return item.ownerId === profileId || item.owner?.id === profileId;
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [followingIds, setFollowingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchItems();
  }, [filter, refreshKey, profile]);

  // Fetch initial following state after auth is ready
  useEffect(() => {
    if (!profile) return;
    api
      .get("/social/following")
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content ?? res.data?.data ?? []);
        const ids = new Set(
          list.map((u) => String(u?.id ?? u?.userId ?? u?.accountId)),
        );
        setFollowingIds(ids);
      })
      .catch(() => {});
  }, [profile]);

  const handleFollow = async (ownerId) => {
    if (!ownerId) return;
    const id = String(ownerId);
    const isFollowing = followingIds.has(id);

    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(id) : next.add(id);
      return next;
    });

    try {
      if (isFollowing) {
        await api.delete(`/social/unfollow/${ownerId}`);
      } else {
        await api.post(`/social/follow/${ownerId}`);
      }
    } catch {
      // Revert on failure
      setFollowingIds((prev) => {
        const next = new Set(prev);
        isFollowing ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getItems(filter);
      const list = Array.isArray(res) ? res : res?.data || [];
      const availableItems = list
        .map(normalizeItem)
        .filter(
          (item) => String(item.status || "").toUpperCase() === "AVAILABLE",
        );
      setItems(availableItems);
    } catch (e) {
      console.error("Failed to fetch items", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    clearTimeout(searchTimeout.current);

    if (!value.trim()) {
      setSearchResults(null); // fall back to full list
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(
          `/items/search?q=${encodeURIComponent(value.trim())}`,
        );
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? []);
        setSearchResults(
          list
            .map(normalizeItem)
            .filter(
              (item) => String(item.status || "").toUpperCase() === "AVAILABLE",
            ),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  // base list: search results take priority over full fetch
  const baseItems = searchResults ?? items;

  const filteredItems =
    filter === "all"
      ? baseItems
      : baseItems.filter((item) => item.category === filter);

  const categories = [
    "all",
    "Clothing",
    "Books",
    "Electronics",
    "Home & Kitchen",
    "Sports & Outdoors",
    "Other",
  ];

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchLoading && <span className="search-spinner" />}
        </div>

        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? "active" : ""}`}
              onClick={() => setFilter(cat)}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <p>No available items</p>
          <p className="empty-hint">Be the first to list something!</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick?.(item)}
              canAfford={karmaBalance >= item.karmaValue}
              isOwnItem={isOwnItem(item)}
              isFollowing={followingIds.has(String(item.owner?.id))}
              onFollow={() => handleFollow(item.owner?.id)}
              karmaBalance={karmaBalance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
