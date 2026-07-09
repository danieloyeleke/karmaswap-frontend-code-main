import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllActiveTrades,
  getSellerEscrows,
  getBuyerActiveTrades,
  getTradeHistory,
} from "../api/escrow";
import TradeCard from "./TradeCard";

const TABS = [
  { id: "active", label: "Active Trades" },
  { id: "selling", label: "Selling" },
  { id: "buying", label: "Buying" },
  { id: "history", label: "History" },
];

export default function MyTrades() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("active");
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrades = async (tab) => {
    setLoading(true);
    setError("");
    try {
      let data = [];
      if (tab === "active") data = await getAllActiveTrades();
      else if (tab === "selling") data = await getSellerEscrows();
      else if (tab === "buying") data = await getBuyerActiveTrades();
      else if (tab === "history") data = await getTradeHistory();
      setTrades(data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
      setError("Failed to load trades. Please try again.");
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleCardClick = (trade) => {
    navigate(`/trades/${trade.escrowId || trade.id}`);
  };

  const handleAcknowledged = () => {
    fetchTrades(activeTab);
  };

  return (
    <div className="my-trades-page">
      <div className="my-trades-header">
        <h2>My Trades</h2>
        <p>Track your active and completed trades in one place.</p>
      </div>

      {/* Tabs */}
      <div className="trades-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`trades-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="trades-content">
        {loading ? (
          <div className="trades-loading">
            <div className="loading-spinner" />
            <p>Loading trades...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : trades.length === 0 ? (
          <div className="trades-empty">
            <p>No trades here yet.</p>
            <span>
              {activeTab === "active" && "Start a trade from the Marketplace."}
              {activeTab === "selling" && "List an item to start selling."}
              {activeTab === "buying" && "Claim an item to start buying."}
              {activeTab === "history" && "Your completed trades will appear here."}
            </span>
          </div>
        ) : (
          <div className="trades-list">
            {trades.map((trade) => (
              <TradeCard
                key={trade.escrowId || trade.id}
                trade={trade}
                currentUser={user}
                currentProfile={profile}
                onClick={() => handleCardClick(trade)}
                onAcknowledged={handleAcknowledged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}