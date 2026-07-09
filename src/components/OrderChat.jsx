import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../contexts/AuthContext";

export default function OrderChat({
  orderId, itemId, buyerId, sellerId,
  buyerName = "Buyer", sellerName = "Seller",
  currentUserRole = "buyer", currentUserName = "You",
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  // Fetch history on mount
  useEffect(() => {
    if (!orderId) return;
    setLoadingHistory(true);
    api.get(`/chat/${orderId}/history`)
      .then((res) => {
        const history = Array.isArray(res.data) ? res.data : [];
        setMessages(history.map((msg) => ({
          id: msg.id,
          role: msg.senderEmail === user?.email ? currentUserRole
            : currentUserRole === "buyer" ? "seller" : "buyer",
          author: msg.senderEmail,
          text: msg.content,
          imageUrl: msg.imageUrl,
          at: msg.timestamp,
        })));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [orderId, user?.email, currentUserRole]);

  // WebSocket connection
  useEffect(() => {
    if (!orderId) return;

    const base = api.defaults.baseURL || "http://localhost:8080/api";
    const wsBase = base.replace(/^http/i, "ws").replace(/\/api\/?$/, "");
    const token = localStorage.getItem("token");

    let socket;
    try {
      socket = new WebSocket(`${wsBase}/ws/escrow-updates?token=${token}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        socket.send(JSON.stringify({ destination: `/topic/escrow/${orderId}` }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              role: msg.senderEmail === user?.email ? currentUserRole
                : currentUserRole === "buyer" ? "seller" : "buyer",
              author: msg.senderEmail,
              text: msg.content,
              imageUrl: msg.imageUrl,
              at: msg.timestamp,
            }];
          });
        } catch { /* ignore */ }
      };

      socket.onclose = () => setConnected(false);
      socket.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }

    return () => socket?.close?.();
  }, [orderId, user?.email, currentUserRole]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !orderId) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        destination: `/app/chat/${orderId}`,
        content: text,
        imageUrl: "",
      }));
    }
    setInput("");
  };

  const nameForRole = (role) => role === "seller" ? sellerName : buyerName;
  const initialForRole = (role) => String(nameForRole(role) || "?").charAt(0).toUpperCase();

  return (
    <div className="order-chat-card">
      <div className="order-chat-header">
        <div>
          <span className="detail-section-label">Conversation</span>
          <h3>Buyer & Seller Chat</h3>
          <p>Keep communication in one place for this order.</p>
          <span style={{ fontSize: "0.75rem", color: connected ? "var(--success)" : "var(--text-light)" }}>
            {connected ? "● Live" : "● Offline"}
          </span>
        </div>
        <div className="chat-participants">
          <span className="chat-participant-chip buyer">
            <span>{initialForRole("buyer")}</span>Buyer
          </span>
          <span className="chat-participant-chip seller">
            <span>{initialForRole("seller")}</span>Seller
          </span>
        </div>
      </div>

      <div className="order-chat-body" ref={listRef}>
        {loadingHistory && <div className="chat-empty">Loading history...</div>}
        {!loadingHistory && messages.length === 0 && (
          <div className="chat-empty">No messages yet.</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.role === "seller" ? "from-seller" : "from-buyer"} ${msg.role === currentUserRole ? "mine" : ""}`}
          >
            <span className={`chat-avatar ${msg.role === "seller" ? "seller" : "buyer"}`}>
              {initialForRole(msg.role)}
            </span>
            <div className="chat-meta">
              <strong>{nameForRole(msg.role)}</strong>
              <span>{new Date(msg.at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</span>
            </div>
            <p>{msg.text}</p>
            {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "0.5rem" }} />}
          </div>
        ))}
      </div>

      <div className="order-chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button className="btn-primary" type="button" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}