import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import {
  acknowledgeNotification,
  cancelEscrow,
  completeEscrow,
  deleteNotification,
  dispatchEscrow,
  fetchEscrowDetails,
  getEscrowActivities,
  getSellerEscrowHistory,
  getSellerEscrowSummary,
  getSellerEscrows,
  getSellerNotifications,
} from "../api/escrow";

const getEscrowId = (value) =>
  String(value?.escrowId || value?.escrow_id || value?.id || "");

const pick = (obj, keys, fallback = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
};

const normalizeStatus = (status) => String(status || "ESCROW").toUpperCase();

const isPendingDispatch = (status) => {
  const normalized = normalizeStatus(status);
  return (
    normalized === "ESCROW" ||
    normalized.includes("AWAITING_DISPATCH") ||
    normalized.includes("PAYMENT_SECURED_ESCROW")
  );
};

const statusMeta = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("CANCEL"))
    return { label: "Cancelled", tone: "issue" };
  if (
    normalized.includes("COMPLETE") ||
    normalized.includes("FUNDS_RELEASED")
  ) {
    return { label: "Completed", tone: "complete" };
  }
  if (normalized.includes("DELIVER"))
    return { label: "Delivered", tone: "progress" };
  if (normalized.includes("TRANSIT") || normalized.includes("DISPATCH")) {
    return { label: "In Transit", tone: "active" };
  }
  return { label: "ESCROW", tone: "pending" };
};

const stageIndexFor = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("COMPLETE") || normalized.includes("FUNDS_RELEASED"))
    return 3;
  if (normalized.includes("DELIVER")) return 2;
  if (normalized.includes("TRANSIT") || normalized.includes("DISPATCH"))
    return 1;
  return 0;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const itemName = (order) =>
  order?.item?.title || order?.itemTitle || order?.title || "Escrow item";
const buyerName = (order) =>
  order?.buyerName || order?.buyer?.username || order?.buyer?.email || "Buyer";
const deliveryMethod = (order) =>
  order?.deliveryMethod || order?.delivery_method || "N/A";
const lockedKarma = (order) =>
  Number(order?.lockedKarma || order?.locked_karma || 0);
const avatarInitial = (name) =>
  String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

const mapNotification = (notification) => ({
  id:
    notification.id ||
    notification.notificationId ||
    notification.notification_id,
  escrowId: getEscrowId(notification),
  itemTitle: pick(
    notification,
    ["itemTitle", "item_name", "title"],
    "Escrow item",
  ),
  buyerName: pick(notification, ["buyerName", "buyer_name"], "Buyer"),
  deliveryMethod: pick(
    notification,
    ["deliveryMethod", "delivery_method"],
    "N/A",
  ),
  createdAt: pick(
    notification,
    ["createdAt", "created_at", "timestamp"],
    new Date().toISOString(),
  ),
  status: pick(notification, ["status", "notificationStatus"], "new"),
  message: pick(
    notification,
    ["message", "description", "type"],
    "Buyer initiated escrow",
  ),
});

function SellerEscrowChat({ escrowId, sellerName = "Seller", buyer = "Buyer", user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  // Issue 7 — fetch chat history on mount
  useEffect(() => {
    if (!escrowId) return;
    setLoadingHistory(true);
    api.get(`/chat/${escrowId}/history`)
      .then((res) => {
        const history = Array.isArray(res.data) ? res.data : [];
        setMessages(history.map((msg) => ({
          id: msg.id,
          escrowId: msg.escrowId,
          senderEmail: msg.senderEmail,
          content: msg.content,
          imageUrl: msg.imageUrl,
          timestamp: msg.timestamp,
          senderRole: msg.senderEmail === (user?.email) ? "SELLER" : "BUYER",
        })));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [escrowId, user?.email]);

  // Issue 6 — fix WebSocket path to match backend
  useEffect(() => {
    if (!escrowId) return;

    const base = api.defaults.baseURL || "http://localhost:8080/api";
    const wsBase = base.replace(/^http/i, "ws").replace(/\/api\/?$/, "");
    const token = localStorage.getItem("token");

    let socket;
    try {
      // Connect with token for auth
      socket = new WebSocket(`${wsBase}/ws/escrow-updates?token=${token}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        // Subscribe to the correct topic
        socket.send(JSON.stringify({
          destination: `/topic/escrow/${escrowId}`,
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              escrowId: msg.escrowId,
              senderEmail: msg.senderEmail,
              content: msg.content,
              imageUrl: msg.imageUrl,
              timestamp: msg.timestamp,
              senderRole: msg.senderEmail === user?.email ? "SELLER" : "BUYER",
            }];
          });
        } catch { /* ignore malformed */ }
      };

      socket.onclose = () => setConnected(false);
      socket.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }

    return () => socket?.close?.();
  }, [escrowId, user?.email]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!escrowId || !text) return;

    // Issue 6 — send to correct WebSocket destination
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        destination: `/app/chat/${escrowId}`,
        content: text,
        imageUrl: "",
      }));
    }
    setInput("");
  };

  return (
    <div className="seller-chat-panel">
      <div className="seller-detail-heading">
        <div>
          <span className="detail-section-label">Buyer-Seller Chat</span>
          <h4>Escrow Conversation</h4>
        </div>
        <span className={`seller-live-badge ${connected ? "live" : ""}`}>
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      <div className="seller-chat-messages" ref={listRef}>
        {loadingHistory && <div className="chat-empty">Loading history...</div>}
        {!loadingHistory && messages.length === 0 && (
          <div className="chat-empty">No messages yet.</div>
        )}
        {messages.map((message) => {
          const isSeller = message.senderRole === "SELLER";
          return (
            <div
              key={message.id || message.timestamp}
              className={`seller-chat-bubble ${isSeller ? "seller" : "buyer"}`}
            >
              <span className={`buyer-avatar ${isSeller ? "seller" : ""}`}>
                {avatarInitial(isSeller ? sellerName : buyer)}
              </span>
              <div>
                <div className="chat-meta">
                  <strong>{isSeller ? sellerName : buyer}</strong>
                  <span>{formatDate(message.timestamp)}</span>
                </div>
                {message.content && <p>{message.content}</p>}
                {message.imageUrl && (
                  <img src={message.imageUrl} alt="Chat attachment" className="seller-chat-image" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="seller-chat-compose">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Message the buyer"
        />
        <button className="btn-primary" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

export default function SellerDashboard({
  alerts = [],
  orders = [],
  summary = {},
  summaryLoading = false,
  user,
  onAck,
  onClear,
  onViewOrder,
  onDispatch,
}) {
  const [remoteSummary, setRemoteSummary] = useState(summary);
  const [remoteAlerts, setRemoteAlerts] = useState(alerts.map(mapNotification));
  const [activeOrders, setActiveOrders] = useState(orders);
  const [history, setHistory] = useState([]);
  const [selectedEscrowId, setSelectedEscrowId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({
    trackingNumber: "",
    preShipmentPhoto: "",
  });
  const [actionState, setActionState] = useState({
    loading: "",
    error: "",
    success: "",
  });
  const [toasts, setToasts] = useState([]);

  const pushToast = (toast) => {
    const id = toast.id || `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  };

  const refreshDashboard = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextAlerts, nextOrders, nextHistory] =
        await Promise.all([
          getSellerEscrowSummary().catch(() => summary),
          getSellerNotifications()
            .then((items) => items.map(mapNotification))
            .catch(() => alerts.map(mapNotification)),
          getSellerEscrows().catch(() => orders),
          getSellerEscrowHistory().catch(() => []),
        ]);
      setRemoteSummary(nextSummary || {});
      setRemoteAlerts(nextAlerts || []);
      setActiveOrders(nextOrders || []);
      setHistory(nextHistory || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
    const interval = window.setInterval(refreshDashboard, 18000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedEscrowId) return;
    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const fallbackOrder = activeOrders.find(
          (order) => getEscrowId(order) === String(selectedEscrowId),
        );
        const [detail, activityItems] = await Promise.all([
          fetchEscrowDetails(selectedEscrowId).catch(() => fallbackOrder),
          getEscrowActivities(selectedEscrowId).catch(() => []),
        ]);
        if (cancelled) return;
        setSelectedOrder(detail || fallbackOrder || null);
        setActivities(activityItems || []);
        setForm({
          trackingNumber:
            detail?.trackingNumber || fallbackOrder?.trackingNumber || "",
          preShipmentPhoto:
            detail?.preShipmentPhoto || fallbackOrder?.preShipmentPhoto || "",
        });
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    loadDetail();
    const interval = window.setInterval(loadDetail, 18000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedEscrowId, activeOrders]);

  const normalizedAlerts = remoteAlerts.length
    ? remoteAlerts
    : alerts.map(mapNotification);
  const openAlerts = normalizedAlerts.filter(
    (alert) => normalizeStatus(alert.status) !== "ACKNOWLEDGED",
  );
  const totalLockedKarma = Number(
    remoteSummary?.totalLockedKarma ??
      remoteSummary?.lockedKarma ??
      summary?.totalLockedKarma ??
      0,
  );
  const totalEscrows = Number(
    remoteSummary?.totalEscrows ??
      remoteSummary?.activeEscrows ??
      activeOrders.length,
  );

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeOrders.filter((order) => {
      const escrowId = getEscrowId(order);
      const status = normalizeStatus(order.status);
      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && isPendingDispatch(status)) ||
        (filter === "transit" &&
          (status.includes("TRANSIT") || status.includes("DISPATCH"))) ||
        (filter === "completed" &&
          (status.includes("COMPLETE") || status.includes("FUNDS_RELEASED")));
      const matchesSearch =
        !needle ||
        itemName(order).toLowerCase().includes(needle) ||
        escrowId.toLowerCase().includes(needle);
      return matchesFilter && matchesSearch;
    });
  }, [activeOrders, filter, query]);

  const selectOrder = (escrowId) => {
    setSelectedEscrowId(String(escrowId));
  };

  const handleAck = async (id) => {
    try {
      await acknowledgeNotification(id);
      setRemoteAlerts((prev) =>
        prev.map((alert) =>
          String(alert.id) === String(id)
            ? { ...alert, status: "acknowledged" }
            : alert,
        ),
      );
      onAck?.(id);
    } catch (error) {
      pushToast({
        title: "Could not acknowledge alert",
        message: error?.message || "Please retry.",
      });
    }
  };

  const handleClear = async (id) => {
    try {
      await deleteNotification(id);
      setRemoteAlerts((prev) =>
        prev.filter((alert) => String(alert.id) !== String(id)),
      );
      onClear?.(id);
    } catch (error) {
      pushToast({
        title: "Could not clear alert",
        message: error?.message || "Please retry.",
      });
    }
  };

  const updateSelectedOrder = (patch) => {
    setSelectedOrder((prev) => (prev ? { ...prev, ...patch } : prev));
    setActiveOrders((prev) =>
      prev.map((order) =>
        getEscrowId(order) === selectedEscrowId
          ? { ...order, ...patch }
          : order,
      ),
    );
  };

  const handleDispatch = async () => {
    if (!selectedEscrowId) return;
    if (!form.preShipmentPhoto) {
      setActionState({
        loading: "",
        success: "",
        error: "Upload a pre-shipment photo before dispatch.",
      });
      return;
    }

    setActionState({ loading: "dispatch", error: "", success: "" });
    try {
      let updated = null;
      if (onDispatch) {
        updated = await onDispatch(selectedEscrowId, form);
      } else {
        updated = await dispatchEscrow(selectedEscrowId, form);
      }
      updateSelectedOrder({
        ...(updated || {}),
        status: updated?.status || "In_Transit",
        trackingNumber: form.trackingNumber || updated?.trackingNumber || "",
        preShipmentPhoto: form.preShipmentPhoto,
      });
      setActionState({
        loading: "",
        error: "",
        success: "Marked as dispatched.",
      });
      pushToast({
        title: "Dispatch recorded",
        message: "Buyer can now see tracking details.",
      });
    } catch (error) {
      setActionState({
        loading: "",
        success: "",
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Dispatch failed.",
      });
    }
  };

  const handleComplete = async () => {
    if (!selectedEscrowId) return;
    setActionState({ loading: "complete", error: "", success: "" });
    try {
      const updated = await completeEscrow(selectedEscrowId);
      updateSelectedOrder({
        ...(updated || {}),
        status: updated?.status || "Funds_Released",
      });
      setActionState({
        loading: "",
        error: "",
        success: "Transaction completed.",
      });
    } catch (error) {
      setActionState({
        loading: "",
        success: "",
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Complete failed.",
      });
    }
  };

  const handleCancel = async () => {
    if (!selectedEscrowId) return;
    setActionState({ loading: "cancel", error: "", success: "" });
    try {
      const updated = await cancelEscrow(selectedEscrowId);
      updateSelectedOrder({
        ...(updated || {}),
        status: updated?.status || "Cancelled",
      });
      setActionState({ loading: "", error: "", success: "Order cancelled." });
    } catch (error) {
      setActionState({
        loading: "",
        success: "",
        error:
          error?.response?.data?.message || error?.message || "Cancel failed.",
      });
    }
  };

  const selectedMeta = statusMeta(selectedOrder?.status);
  const selectedStage = stageIndexFor(selectedOrder?.status);

  return (
    <section className="seller-dashboard-page">
      <div className="seller-dashboard-shell">
        <div className="seller-dashboard-header">
          <div>
            <span className="detail-section-label">Seller Dashboard</span>
            <h2>Escrow Operations</h2>
            <p>
              Monitor locked payments, respond to buyers, and keep fulfillment
              moving.
            </p>
          </div>
          <span
            className={`seller-live-badge ${!loading && !summaryLoading ? "live" : ""}`}
          >
            {loading || summaryLoading ? "Refreshing" : "Live polling"}
          </span>
        </div>

        <div className="seller-stat-grid">
          <div className="seller-stat-card karma">
            <span className="seller-stat-icon">K</span>
            <div>
              <span>Total Locked Karma</span>
              <strong>{totalLockedKarma}</strong>
            </div>
          </div>
          <div className="seller-stat-card active">
            <span className="seller-stat-icon">S</span>
            <div>
              <span>Total Escrows</span>
              <strong>{totalEscrows}</strong>
            </div>
          </div>
          <div className="seller-stat-card alert">
            <span className="seller-stat-icon">!</span>
            <div>
              <span>Open Alerts</span>
              <strong>{openAlerts.length}</strong>
            </div>
          </div>
        </div>

        <div className="seller-dashboard-layout">
          <div className="seller-dashboard-main">
            <section className="seller-panel">
              <div className="seller-panel-head">
                <div>
                  <span className="detail-section-label">
                    Alerts & Notifications
                  </span>
                  <h3>Notification Center</h3>
                </div>
                <span className="seller-count-pill">
                  {normalizedAlerts.length} alerts
                </span>
              </div>

              <div className="seller-notification-list">
                {normalizedAlerts.length === 0 ? (
                  <div className="empty-state">No seller notifications.</div>
                ) : (
                  normalizedAlerts.map((alert) => {
                    const acknowledged =
                      normalizeStatus(alert.status) === "ACKNOWLEDGED";
                    return (
                      <article
                        key={alert.id || alert.escrowId}
                        className={`seller-notification-card ${acknowledged ? "ack" : "new"}`}
                      >
                        <div>
                          <span
                            className={`seller-alert-dot ${acknowledged ? "ack" : "new"}`}
                          />
                        </div>
                        <div className="seller-notification-copy">
                          <div className="seller-notification-title">
                            <strong>{alert.itemTitle}</strong>
                            <span>{acknowledged ? "Acknowledged" : "New"}</span>
                          </div>
                          <p>{alert.message}</p>
                          <div className="seller-notification-meta">
                            <span>Buyer: {alert.buyerName}</span>
                            <span>Delivery: {alert.deliveryMethod}</span>
                            <span>Escrow: {alert.escrowId || "N/A"}</span>
                            <span>{formatDate(alert.createdAt)}</span>
                          </div>
                        </div>
                        <div className="seller-row-actions">
                          <button
                            className="btn-secondary"
                            onClick={() => selectOrder(alert.escrowId)}
                          >
                            View Order
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={acknowledged}
                            onClick={() => handleAck(alert.id)}
                          >
                            Acknowledge
                          </button>
                          <button
                            className="btn-tertiary"
                            onClick={() => handleClear(alert.id)}
                          >
                            Clear
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="seller-panel">
              <div className="seller-panel-head seller-orders-head">
                <div>
                  <span className="detail-section-label">
                    Active Escrow Orders
                  </span>
                  <h3>Transactions</h3>
                </div>
                <div className="seller-tools">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search item or escrow ID"
                  />
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending Dispatch</option>
                    <option value="transit">In Transit</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="seller-orders-table">
                <div className="seller-orders-row header">
                  <span>Item</span>
                  <span>Buyer</span>
                  <span>Delivery</span>
                  <span>Status</span>
                  <span>Karma</span>
                  <span>Escrow ID</span>
                  <span>Created</span>
                </div>
                {filteredOrders.map((order) => {
                  const escrowId = getEscrowId(order);
                  const meta = statusMeta(order.status);
                  return (
                    <button
                      key={escrowId}
                      type="button"
                      className={`seller-orders-row ${isPendingDispatch(order.status) ? "urgent" : ""}`}
                      onClick={() => selectOrder(escrowId)}
                    >
                      <span>{itemName(order)}</span>
                      <span className="seller-buyer-cell">
                        <span className="buyer-avatar">
                          {avatarInitial(buyerName(order))}
                        </span>
                        {buyerName(order)}
                      </span>
                      <span>{deliveryMethod(order)}</span>
                      <span>
                        <span className={`seller-status-badge ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </span>
                      <span>{lockedKarma(order)}</span>
                      <span>{escrowId}</span>
                      <span>
                        {formatDate(
                          order.placedAt || order.createdAt || order.created_at,
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="seller-orders-mobile">
                {filteredOrders.map((order) => {
                  const escrowId = getEscrowId(order);
                  const meta = statusMeta(order.status);
                  return (
                    <article
                      key={escrowId}
                      className="seller-order-card"
                      onClick={() => selectOrder(escrowId)}
                    >
                      <div>
                        <h4>{itemName(order)}</h4>
                        <span className={`seller-status-badge ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p>Buyer: {buyerName(order)}</p>
                      <p>Delivery: {deliveryMethod(order)}</p>
                      <p>Escrow: {escrowId}</p>
                      <strong>{lockedKarma(order)} Karma locked</strong>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="seller-panel">
              <div className="seller-panel-head">
                <div>
                  <span className="detail-section-label">Order History</span>
                  <h3>Completed Transactions</h3>
                </div>
              </div>
              <div className="seller-history-list">
                {history.length === 0 ? (
                  <div className="empty-state">
                    No completed seller transactions yet.
                  </div>
                ) : (
                  history.map((order) => (
                    <div
                      key={getEscrowId(order)}
                      className="seller-history-row"
                    >
                      <strong>{itemName(order)}</strong>
                      <span>{buyerName(order)}</span>
                      <span>{statusMeta(order.status).label}</span>
                      <span>{lockedKarma(order)} Karma</span>
                      <span>
                        {formatDate(
                          order.fundsReleasedAt ||
                            order.completedAt ||
                            order.updatedAt,
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="seller-detail-panel">
            {!selectedOrder ? (
              <div className="seller-panel seller-empty-detail">
                <span className="seller-stat-icon">O</span>
                <h3>Select an order</h3>
                <p>
                  Open an alert or active escrow to view seller actions,
                  timeline, and chat.
                </p>
              </div>
            ) : (
              <div className="seller-panel seller-detail-card">
                <div className="seller-detail-heading">
                  <div>
                    <span className="detail-section-label">Order Detail</span>
                    <h3>{itemName(selectedOrder)}</h3>
                  </div>
                  <span className={`seller-status-badge ${selectedMeta.tone}`}>
                    {selectedMeta.label}
                  </span>
                </div>
                {detailLoading ? (
                  <p className="detail-meta-label">Refreshing details...</p>
                ) : null}

                <div className="seller-detail-summary">
                  <div>
                    <span>Buyer</span>
                    <strong>{buyerName(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Delivery</span>
                    <strong>{deliveryMethod(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Locked Karma</span>
                    <strong>{lockedKarma(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Escrow ID</span>
                    <strong>{selectedEscrowId}</strong>
                  </div>
                  <div className="span-all">
                    <span>Delivery Details</span>
                    <strong>{selectedOrder.deliveryDetails || "N/A"}</strong>
                  </div>
                </div>

                <div className="seller-progress-line">
                  {["Escrow", "Dispatched", "Delivered", "Completed"].map(
                    (stage, index) => (
                      <span
                        key={stage}
                        className={index <= selectedStage ? "active" : ""}
                      >
                        {stage}
                      </span>
                    ),
                  )}
                </div>

                <div className="seller-actions-box">
                  <span className="detail-section-label">Seller Actions</span>
                  <label
                    className="checkout-label"
                    htmlFor="seller-tracking-number"
                  >
                    Tracking Number
                  </label>
                  <input
                    id="seller-tracking-number"
                    className="checkout-input"
                    value={form.trackingNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        trackingNumber: event.target.value,
                      }))
                    }
                    placeholder="Add tracking or delivery confirmation"
                  />
                  <label className="checkout-label" htmlFor="seller-photo-url">
                    Pre-shipment Photo
                  </label>
                  <input
                    id="seller-photo-url"
                    className="checkout-input"
                    value={form.preShipmentPhoto}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        preShipmentPhoto: event.target.value,
                      }))
                    }
                    placeholder="Paste image URL or uploaded image data"
                  />
                  {form.preShipmentPhoto ? (
                    <img
                      src={form.preShipmentPhoto}
                      alt="Pre-shipment preview"
                      className="evidence-photo"
                    />
                  ) : null}
                  {actionState.error ? (
                    <div className="error-message">{actionState.error}</div>
                  ) : null}
                  {actionState.success ? (
                    <div className="success-message">{actionState.success}</div>
                  ) : null}
                  <div className="seller-action-buttons">
                    <button
                      className="btn-primary"
                      disabled={actionState.loading === "dispatch"}
                      onClick={handleDispatch}
                    >
                      {actionState.loading === "dispatch"
                        ? "Dispatching..."
                        : "Mark as Dispatched"}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={actionState.loading === "complete"}
                      onClick={handleComplete}
                    >
                      {actionState.loading === "complete"
                        ? "Completing..."
                        : "Complete Transaction"}
                    </button>
                    <button
                      className="btn-tertiary"
                      disabled={actionState.loading === "cancel"}
                      onClick={handleCancel}
                    >
                      {actionState.loading === "cancel"
                        ? "Cancelling..."
                        : "Cancel Order"}
                    </button>
                  </div>
                </div>

                <div className="seller-timeline">
                  <div className="seller-detail-heading">
                    <div>
                      <span className="detail-section-label">
                        Escrow Activity
                      </span>
                      <h4>Timeline</h4>
                    </div>
                  </div>
                  {activities.length === 0 ? (
                    <div className="empty-state">
                      No activity events returned yet.
                    </div>
                  ) : (
                    activities.map((activity, index) => (
                      <div
                        key={activity.id || index}
                        className="seller-timeline-item"
                      >
                        <span />
                        <div>
                          <strong>
                            {activity.description ||
                              activity.message ||
                              "Escrow activity"}
                          </strong>
                          <p>
                            {activity.actor || activity.actorRole || "System"} ·{" "}
                            {formatDate(
                              activity.timestamp || activity.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <SellerEscrowChat
                  escrowId={selectedEscrowId}
                  sellerName={user?.username || user?.email || "Seller"}
                  buyer={buyerName(selectedOrder)}
                  user={user}
                />
              </div>
            )}
          </aside>
        </div>
      </div>

      {toasts.length > 0 ? (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast-card">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
