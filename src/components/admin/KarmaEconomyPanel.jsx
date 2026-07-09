// KarmaEconomyPanel.jsx → src/components/admin/KarmaEconomyPanel.jsx
// Replaces the inline KarmaEconomyPanel in AdminApp.jsx
// Import and use as: <KarmaEconomyPanel />

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../../api/axios";

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function KarmaEconomyPanel() {
  const [economy, setEconomy]           = useState(null);
  const [concentration, setConcentration] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/karma-economy"),
      api.get("/admin/karma-concentration"),
    ])
      .then(([eRes, cRes]) => {
        setEconomy(eRes.data);
        setConcentration(cRes.data);
      })
      .catch(() => setError("Failed to load karma economy data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading"><div className="loading-spinner" /></div>;
  if (error)   return <p className="error-message">{error}</p>;

  const e = economy        || {};
  const c = concentration  || {};

  return (
    <div>
      <h2 className="admin-page-title">Karma Economy</h2>

      <p className="detail-section-label">Circulation</p>
      <div className="admin-stat-grid">
        <StatCard label="Total in Circulation" value={e.totalKarmaInCirculation} />
        <StatCard label="Total Earned"         value={e.totalKarmaEarned} />
        <StatCard label="Total Spent"          value={e.totalKarmaSpent} />
        <StatCard label="Total Gifted"         value={e.totalKarmaGifted} />
      </div>

      <p className="detail-section-label" style={{ marginTop: 28 }}>Concentration</p>

      {c.hoardingAlert && (
        <div className="admin-hoarding-alert">
          <AlertTriangle size={16} />
          Hoarding alert — top 1% hold {c.concentrationPercent?.toFixed(1)}% of all karma in circulation.
          Consider activating karma boost or gifting incentives.
        </div>
      )}

      <div className="admin-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Top 1% Holdings"     value={c.topOnePercentHoldings} />
        <StatCard label="Concentration %"     value={c.concentrationPercent != null ? `${c.concentrationPercent.toFixed(2)}%` : "—"} />
      </div>

      {c.topHolders?.length > 0 && (
        <>
          <p className="detail-section-label">Top Holders</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Username</th><th>Karma Balance</th><th>% of Circulation</th></tr>
              </thead>
              <tbody>
                {c.topHolders.map((h) => (
                  <tr key={h.userId}>
                    <td>{h.username}</td>
                    <td>{h.karmaBalance}</td>
                    <td>{h.percentOfCirculation?.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
