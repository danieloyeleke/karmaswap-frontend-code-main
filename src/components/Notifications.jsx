import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Gift,
  MessageCircle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import api from "../api/axios";

const TYPE_ICONS = {
  TRADE_STARTED: Package,
  TRADE_DISPATCHED: Truck,
  TRADE_COMPLETED: CheckCircle,
  TRADE_CANCELLED: XCircle,
  TRADE_ABANDONED: Clock,
  NEW_FOLLOWER: UserPlus,
  KARMA_GIFTED: Gift,
  NEW_MESSAGE: MessageCircle,
  ACCOUNT_SUSPENDED: ShieldAlert,
};

const TYPE_ICON_CLASS = {
  TRADE_STARTED: "notif-icon-escrow",
  TRADE_DISPATCHED: "notif-icon-dispatched",
  TRADE_COMPLETED: "notif-icon-success",
  TRADE_CANCELLED: "notif-icon-cancelled",
  TRADE_ABANDONED: "notif-icon-abandoned",
  NEW_FOLLOWER: "notif-icon-social",
  KARMA_GIFTED: "notif-icon-karma",
  NEW_MESSAGE: "notif-icon-escrow",
  ACCOUNT_SUSPENDED: "notif-icon-cancelled",
};

const getIcon = (type) => TYPE_ICONS[type] || Bell;
const getIconClass = (type) => TYPE_ICON_CLASS[type] || "notif-icon-escrow";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveNavigation = (notification) => {
  const { referenceType, referenceId } = notification;
  if (!referenceId) return null;
  if (referenceType === "ESCROW" || referenceType === "CHAT") {
    return `/trades/${referenceId}`;
  }
  return null;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/acknowledge`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.allSettled(
        unread.map((n) => api.patch(`/notifications/${n.id}/acknowledge`)),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    const destination = resolveNavigation(notification);
    if (destination) navigate(destination);
  };

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h2>Notifications</h2>
          <p>Stay updated on your trades and activity.</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-secondary" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`notif-filter-btn ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === "unread" && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="notifications-loading">
            <div className="loading-spinner" />
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="notifications-empty">
            <Bell size={32} />
            <p>
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            <span>We'll let you know when something happens.</span>
          </div>
        ) : (
          filtered.map((notification) => {
            const Icon = getIcon(notification.type);
            const iconClass = getIconClass(notification.type);
            const clickable = !!resolveNavigation(notification);
            return (
              <div
                key={notification.id}
                className={`notifications-row ${!notification.read ? "unread" : ""} ${clickable ? "clickable" : ""}`}
                onClick={() => handleClick(notification)}
              >
                <div className={`notif-item-icon ${iconClass}`}>
                  <Icon size={20} />
                </div>
                <div className="notifications-row-content">
                  <p className="notifications-row-title">
                    {notification.title}
                  </p>
                  <p className="notifications-row-message">
                    {notification.message}
                  </p>
                  <p className="notifications-row-time">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && <span className="notif-dot" />}
                <button
                  className="notifications-row-delete"
                  onClick={(e) => handleDelete(e, notification.id)}
                  aria-label="Delete notification"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
