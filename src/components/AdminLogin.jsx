import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Admin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  // const [debug, setDebug]       = useState(null); // shows raw /admin/me response

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setDebug(null);

    try {
      // Step 1 — login (same endpoint as regular users)
      const loginRes = await api.post("/auth/login", { email, password });
      const token = loginRes.data?.token ?? loginRes.data?.accessToken ?? loginRes.data;

      if (!token || typeof token !== "string") {
        setError("Login succeeded but no token was returned. Check the response shape.");
        setDebug(JSON.stringify(loginRes.data, null, 2));
        setLoading(false);
        return;
      }

      // Step 2 — store token so the axios instance picks it up
      localStorage.setItem("token", token);

      // Step 3 — verify admin access
      try {
        const meRes = await api.get("/admin/me");
        setDebug(JSON.stringify(meRes.data, null, 2));

        if (!meRes.data?.role) {
          setError("Logged in, but /admin/me returned no role.");
          return;
        }

        // Success — go to dashboard
        navigate("/admin");

      } catch (meErr) {
        const status = meErr?.response?.status;
        const body   = meErr?.response?.data;

        if (status === 403) {
          setError(`This account exists but is not an admin (403). Make sure the user is seeded with an admin role in the DB.`);
        } else if (status === 401) {
          setError("Token was rejected by /admin/me (401). The token may not be attached correctly.");
        } else {
          setError(`/admin/me failed with status ${status ?? "unknown"}.`);
        }

        setDebug(JSON.stringify(body ?? meErr?.message, null, 2));
        localStorage.removeItem("token"); // clean up bad token
      }

    } catch (loginErr) {
      const status = loginErr?.response?.status;
      if (status === 401 || status === 400 || status === 403) {
        setError("Invalid email or password.");
      } else if (!status) {
        setError("Could not reach the server. Check your connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      // Only show debug for non-auth errors (server/network issues)
      if (status !== 401 && status !== 400 && status !== 403) {
        setDebug(JSON.stringify(loginErr?.response?.data ?? loginErr?.message, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-sidebar__logo" style={{ width: 40, height: 40, fontSize: 15 }}>KS</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>KarmaSwap</div>
            <div style={{ fontSize: 12, color: "var(--text-light)" }}>Admin Dashboard</div>
          </div>
        </div>

        <div className="admin-form-col">
          <input
            className="admin-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <input
            className="admin-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginTop: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Debug output — shows raw server responses to help diagnose issues */}
        {debug && (
          <div className="admin-login-debug">
            <div className="admin-login-debug__label">Server response</div>
            <pre>{debug}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
