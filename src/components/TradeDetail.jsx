import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import {
  acknowledgeEscrow,
  cancelEscrow,
  completeEscrow,
  dispatchEscrow,
  fetchEscrow,
  rateSeller,
} from "../api/escrow";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { ShieldAlert } from "lucide-react";
import "../styles/TradeDetail.css";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  ESCROW: "Karma Locked",
  AWAITING_DISPATCH: "Karma Locked",
  DISPATCHED: "In Transit",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ABANDONED: "Abandoned",
};

const STAGES = [
  { key: "ESCROW", label: "Karma Locked" },
  { key: "DISPATCHED", label: "Dispatched" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
];

const getStageIndex = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED") return 3;
  if (s === "DELIVERED") return 2;
  if (s === "DISPATCHED") return 1;
  if (s === "ESCROW" || s === "AWAITING_DISPATCH") return 0; // ← add
  return 0;
};

const isTerminal = (status) =>
  ["COMPLETED", "CANCELLED", "ABANDONED"].includes(
    String(status || "").toUpperCase(),
  );

const formatTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitial = (name) =>
  String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

// ─── CHAT ────────────────────────────────────────────────────────────────────

function TradeChat({
  escrowId,
  currentUserEmail,
  buyerName,
  sellerName,
  isSeller,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!escrowId) return;
    api
      .get(`/chat/${escrowId}/history`)
      .then((res) => {
        const history = Array.isArray(res.data) ? res.data : [];
        setMessages(
          history.map((msg) => ({
            id: msg.id,
            senderEmail: msg.senderEmail,
            content: msg.content,
            imageUrl: msg.imageUrl,
            timestamp: msg.timestamp,
            isOwn: msg.senderEmail === currentUserEmail,
          })),
        );
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [escrowId, currentUserEmail]);

  useEffect(() => {
    if (!escrowId) return;

    const base = api.defaults.baseURL || "http://localhost:8080/api";
    const wsBase = base.replace(/\/api\/?$/, ""); // keep http://, don't replace with ws://
    const token = localStorage.getItem("token");

    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBase}/ws-chat`),
      connectHeaders: {
        Authorization: `Bearer ${token}`, // token goes here, NOT in the URL
      },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/escrow/${escrowId}`, (message) => {
          try {
            const msg = JSON.parse(message.body);
            if (!msg?.id) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [
                ...prev,
                {
                  id: msg.id,
                  senderEmail: msg.senderEmail,
                  content: msg.content,
                  imageUrl: msg.imageUrl,
                  timestamp: msg.timestamp,
                  isOwn: msg.senderEmail === currentUserEmail,
                },
              ];
            });
          } catch {
            /* ignore */
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    socketRef.current = client;

    return () => client.deactivate();
  }, [escrowId, currentUserEmail]);

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current?.connected) return; // STOMP uses .connected

    socketRef.current.publish({
      // STOMP uses .publish()
      destination: `/app/chat/${escrowId}`,
      body: JSON.stringify({
        // payload goes in `body`
        content: text,
        imageUrl: "",
      }),
    });

    setInput("");
  };

  const nameFor = (email) =>
    email === currentUserEmail ? "You" : isSeller ? buyerName : sellerName;

  return (
    <div className="trade-chat">
      <div className="trade-chat-header">
        <h3>Conversation</h3>
        <span className={`trade-chat-status ${connected ? "live" : ""}`}>
          {connected ? "● Live" : "● Offline"}
        </span>
      </div>

      <div className="trade-chat-messages" ref={listRef}>
        {loading && <div className="trade-chat-empty">Loading messages...</div>}
        {!loading && messages.length === 0 && (
          <div className="trade-chat-empty">No messages yet. Say hello!</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`trade-chat-bubble ${msg.isOwn ? "own" : "other"}`}
          >
            <span className="trade-chat-avatar">
              {getInitial(nameFor(msg.senderEmail))}
            </span>
            <div className="trade-chat-content">
              <div className="trade-chat-meta">
                <strong>{nameFor(msg.senderEmail)}</strong>
                <span>{formatTime(msg.timestamp)}</span>
              </div>
              {msg.content && <p>{msg.content}</p>}
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="attachment"
                  className="trade-chat-image"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="trade-chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
        />
        <button className="btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

// ─── ACTION PANEL ────────────────────────────────────────────────────────────

function ActionPanel({ trade, isSeller, status, onRefresh, isDisputed }) {
  const [trackingNumber, setTrackingNumber] = useState(
    trade?.trackingNumber || "",
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(
    trade?.preShipmentPhoto || "",
  );
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);

  const escrowId = trade?.escrowId || trade?.id;
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDispatch = async () => {
    if (!photoFile && !photoPreview) {
      setError("Please upload a pre-shipment photo.");
      return;
    }
    setLoading("dispatch");
    setError("");
    setSuccess("");
    try {
      const base64 = photoPreview.includes(",")
        ? photoPreview.split(",")[1]
        : photoPreview;

      await dispatchEscrow(escrowId, {
        trackingNumber,
        preShipmentPhoto: base64,
      });
      setSuccess("Marked as dispatched!");
      onRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Dispatch failed.");
    } finally {
      setLoading("");
    }
  };

  const handleComplete = async () => {
    setLoading("complete");
    setError("");
    setSuccess("");
    try {
      await completeEscrow(escrowId);
      setSuccess("Receipt confirmed! Karma released to seller.");
      onRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to confirm receipt.");
    } finally {
      setLoading("");
    }
  };

  const handleCancel = async () => {
    const confirmMessage = isSeller
      ? "Cancel this trade? Karma will be refunded to the buyer."
      : "Cancel this trade? Your locked karma will be refunded to you.";

    if (!window.confirm(confirmMessage)) return;
    setLoading("cancel");
    setError("");
    setSuccess("");
    try {
      await cancelEscrow(escrowId);
      setSuccess("Trade cancelled.");
      onRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Cancel failed.");
    } finally {
      setLoading("");
    }
  };

  const handleRate = async (value) => {
    setRating(value);
    try {
      await rateSeller(escrowId, value);
      setRated(true);
    } catch (err) {
      console.error("Rating failed:", err);
    }
  };

  if (isDisputed) {
    return (
      <div className="trade-action-panel">
        <h3>⚖️ Dispute In Progress</h3>
        <p className="trade-action-hint">
          This trade is under moderator review. No actions are available until
          the dispute is resolved.
        </p>
      </div>
    );
  }

  // Seller actions
  if (isSeller) {
    if (status === "ESCROW" || status === "AWAITING_DISPATCH") {
      return (
        <div className="trade-action-panel">
          <h3>Your Actions</h3>
          <p className="trade-action-hint">
            Prepare the item and mark it as dispatched once shipped.
          </p>
          <label className="checkout-label">Tracking Number (optional)</label>
          <input
            className="checkout-input"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
          />
          <label className="checkout-label">Pre-shipment Photo</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Pre-shipment"
              className="trade-photo-preview"
            />
          )}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button
            className="btn-primary"
            onClick={handleDispatch}
            disabled={loading === "dispatch"}
          >
            {loading === "dispatch" ? "Dispatching..." : "Mark as Dispatched"}
          </button>
          <button
            className="btn-tertiary"
            onClick={handleCancel}
            disabled={!!loading}
            style={{ marginTop: "0.5rem" }}
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel Trade"}
          </button>
        </div>
      );
    }
    if (status === "DISPATCHED" || status === "DELIVERED") {
      return (
        <div className="trade-action-panel">
          <h3>Waiting for Buyer</h3>
          <p className="trade-action-hint">
            The item has been dispatched. Karma will be released once the buyer
            confirms receipt.
          </p>
          {trade?.trackingNumber && (
            <div className="trade-tracking">
              <span className="detail-section-label">Tracking</span>
              <strong>{trade.trackingNumber}</strong>
            </div>
          )}
          <button
            className="btn-tertiary"
            style={{ marginTop: "0.5rem" }}
            onClick={() => navigate(`/dispute/${escrowId}`)}
          >
            Report a Problem
          </button>
        </div>
      );
    }
  }

  // Buyer actions
  if (!isSeller) {
    if (status === "ESCROW" || status === "AWAITING_DISPATCH") {
      return (
        <div className="trade-action-panel">
          <h3>Waiting for Seller</h3>
          <p className="trade-action-hint">
            The seller is preparing your item. You'll be notified when it's
            dispatched.
          </p>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button
            className="btn-tertiary"
            onClick={handleCancel}
            disabled={!!loading}
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel Trade"}
          </button>
        </div>
      );
    }
    if (status === "DISPATCHED" || status === "DELIVERED") {
      return (
        <div className="trade-action-panel">
          <h3>Confirm Receipt</h3>
          <p className="trade-action-hint">
            Once you've received and checked the item, confirm receipt to
            release karma to the seller.
          </p>
          {trade?.trackingNumber && (
            <div className="trade-tracking">
              <span className="detail-section-label">Tracking</span>
              <strong>{trade.trackingNumber}</strong>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button
            className="btn-primary"
            onClick={handleComplete}
            disabled={loading === "complete"}
          >
            {loading === "complete" ? "Confirming..." : "Confirm Received"}
          </button>
          <button
            className="btn-tertiary"
            style={{ marginTop: "0.5rem" }}
            onClick={() => navigate(`/dispute/${escrowId}`)}
          >
            Report a Problem
          </button>
        </div>
      );
    }
    if (status === "COMPLETED" && !rated) {
      return (
        <div className="trade-action-panel">
          <h3>Rate the Seller</h3>
          <p className="trade-action-hint">How was your experience?</p>
          <div className="trade-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`trade-star ${rating >= star ? "filled" : ""}`}
                onClick={() => handleRate(star)}
              >
                ★
              </button>
            ))}
          </div>
          {rated && <div className="success-message">Thanks for rating!</div>}
        </div>
      );
    }
  }

  // Terminal states
  if (isTerminal(status)) {
    return (
      <div className="trade-action-panel">
        <h3>{STATUS_LABELS[status] || status}</h3>
        <p className="trade-action-hint">This trade has been concluded.</p>
      </div>
    );
  }

  return null;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function TradeDetail() {
  const { escrowId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acknowledging, setAcknowledging] = useState(false);
  const isDisputed = trade?.disputeStatus === "PENDING";

  const loadTrade = async () => {
    try {
      const data = await fetchEscrow(escrowId);
      setTrade(data);
    } catch (err) {
      console.error("Failed to load trade:", err);
      setError("Trade not found or you don't have access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escrowId) loadTrade();
  }, [escrowId]);

  const profileId = profile?.id || profile?.accountId;
  const isSeller = trade
    ? trade.sellerId === profileId ||
      trade.sellerName === profile?.username ||
      trade.sellerName === user?.username
    : false;

  const status = String(trade?.status || "ESCROW").toUpperCase();
  const stageIndex = getStageIndex(status);
  const terminal = isTerminal(status);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await acknowledgeEscrow(escrowId);
      navigate("/trades");
    } catch (err) {
      console.error("Acknowledge failed:", err);
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading trade...</p>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="trade-detail-error">
        <p>{error || "Trade not found."}</p>
        <button className="btn-secondary" onClick={() => navigate("/trades")}>
          Back to My Trades
        </button>
      </div>
    );
  }

  const imageUrl = trade.itemImageUrl || trade.item?.imageUrl || "";
  const otherParty = isSeller
    ? trade.buyerName || "Buyer"
    : trade.sellerName || "Seller";

  return (
    <div className="trade-detail-page">
      {/* Header */}
      <div className="trade-detail-header">
        <button className="back-btn" onClick={() => navigate("/trades")}>
          ← My Trades
        </button>
        <span className={`trade-role-tag ${isSeller ? "selling" : "buying"}`}>
          {isSeller ? "Selling" : "Buying"}
        </span>
      </div>

      {/* Item Summary */}
      <div className="trade-detail-summary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={trade.itemTitle}
            className="trade-detail-image"
          />
        ) : (
          <div className="trade-detail-image trade-detail-image-empty">📦</div>
        )}
        <div className="trade-detail-summary-info">
          <h2>{trade.itemTitle || "Trade Item"}</h2>
          <p className="trade-detail-party">
            {isSeller ? "Buyer" : "Seller"}:{" "}
            <strong
              className="clickable-username-inline"
              onClick={() => navigate(`/profile/${otherParty}`)}
            >
              {otherParty}
            </strong>
          </p>
          <div className="trade-detail-meta">
            <span className="trade-karma">
              ✨ {trade.lockedKarma || trade.karmaAmount || 0} Karma
            </span>
            <span
              className={`trade-status-badge status-${status.toLowerCase()}`}
            >
              {STATUS_LABELS[status] || status}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {!terminal && (
        <div className="trade-timeline">
          {STAGES.map((stage, idx) => (
            <div
              key={stage.key}
              className={`trade-timeline-step ${idx <= stageIndex ? "active" : ""} ${idx === stageIndex ? "current" : ""}`}
            >
              <div className="trade-timeline-dot">
                {idx < stageIndex ? "✓" : idx + 1}
              </div>
              <span>{stage.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main grid — chat + actions */}
      <div className="trade-detail-grid">
        {/* Chat */}
        <TradeChat
          escrowId={escrowId}
          currentUserEmail={user?.email}
          buyerName={trade.buyerName || "Buyer"}
          sellerName={trade.sellerName || "Seller"}
          isSeller={isSeller}
        />

        {isDisputed && (
          <div className="trade-dispute-banner">
            <ShieldAlert size={18} />
            <div>
              <strong>Dispute In Progress</strong>
              <p>
                A dispute has been raised for this trade. Karma is frozen
                pending moderator review.
              </p>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="trade-detail-actions">
          <ActionPanel
            trade={trade}
            isSeller={isSeller}
            status={status}
            onRefresh={loadTrade}
            isDisputed={isDisputed}
          />

          {/* Acknowledge button for terminal trades */}
          {terminal && !trade.acknowledged && (
            <button
              className="btn-secondary"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging ? "..." : "Acknowledge & Move to History"}
            </button>
          )}

          {/* Countdown */}
          {!terminal && trade.escrowReleaseAt && (
            <div className="trade-countdown">
              <span className="detail-section-label">Auto-release</span>
              <p>{formatTime(trade.escrowReleaseAt)}</p>
              <small>
                Karma releases automatically if buyer doesn't respond.
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
