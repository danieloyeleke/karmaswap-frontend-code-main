import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Admin.css";

export default function AdminBootstrap() {
  const navigate = useNavigate();
  const [userId, setUserId]   = useState("");
  const [secret, setSecret]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async () => {
    if (!userId || !secret) return;
    setLoading(true);
    setError(null);

    try {
      await api.post("/admin/bootstrap", { userId, secret });
      navigate("/admin/login");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError("Invalid secret key.");
      } else if (status === 409) {
        setError("Bootstrap unavailable — an admin account already exists.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-sidebar__logo" style={{ width: 40, height: 40, fontSize: 15 }}>KS</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>KarmaSwap</div>
            <div style={{ fontSize: 12, color: "var(--text-light)" }}>Admin Bootstrap</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 20, lineHeight: 1.6 }}>
          First-time setup only. Grant admin access to an existing user.
          This endpoint will be rejected if an admin already exists.
        </p>

        <div className="admin-form-col">
          <input
            className="admin-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            placeholder="User ID (UUID)"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <input
            className="admin-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            type="password"
            placeholder="Secret key"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleSubmit}
            disabled={loading || !userId || !secret}
          >
            {loading ? "Setting up…" : "Bootstrap Admin"}
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginTop: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="/admin/login" style={{ fontSize: 13, color: "var(--text-light)" }}>
            Already have an admin account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}