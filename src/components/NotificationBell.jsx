import React, { useEffect, useRef, useState } from "react";
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
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Resolve where a notification should navigate to, if anywhere
const resolveNavigation = (notification) => {
  const { referenceType, referenceId } = notification;
  if (!referenceId) return null;
  if (referenceType === "ESCROW" || referenceType === "CHAT") {
    return `/trades/${referenceId}`;
  }
  // USER and KARMA_TRANSACTION are non-clickable
  return null;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      const count =
        typeof res.data === "number" ? res.data : res.data?.count || 0;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      const data = Array.isArray(res.data) ? res.data : [];
      setNotifications(data.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => setOpen((prev) => !prev);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/acknowledge`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    const destination = resolveNavigation(notification);
    if (destination) {
      setOpen(false);
      navigate(destination);
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
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button
        className="notif-bell-btn"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-dropdown-list">
            {loading ? (
              <div className="notif-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <p>No notifications yet</p>
                <span>We'll let you know when something happens.</span>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const iconClass = getIconClass(notification.type);
                const clickable = !!resolveNavigation(notification);
                return (
                  <div
                    key={notification.id}
                    className={`notif-item ${!notification.read ? "unread" : ""} ${clickable ? "clickable" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`notif-item-icon ${iconClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="notif-item-content">
                      <p className="notif-item-title">{notification.title}</p>
                      <p className="notif-item-message">
                        {notification.message}
                      </p>
                      <p className="notif-item-time">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && <span className="notif-dot" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-dropdown-footer" onClick={handleViewAll}>
            View all
          </div>
        </div>
      )}
    </div>
  );
}
