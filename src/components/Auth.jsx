import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { createPortal } from "react-dom";
import { NIGERIA_STATES, buildLocation } from "../utils/nigeriaLocations";
import { TERMS_SECTIONS } from "../data/termsContent";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const validateUsername = (value) => {
  if (value.length < 3) return "Username must be at least 3 characters.";
  if (value.length > 20) return "Username must be 20 characters or less.";
  if (!USERNAME_REGEX.test(value))
    return "Username can only contain letters, numbers, and underscores.";
  if (/^_|_$/.test(value))
    return "Username cannot start or end with an underscore.";
  if (/_{2,}/.test(value))
    return "Username cannot contain consecutive underscores.";
  return null;
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [locState, setLocState] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locArea, setLocArea] = useState("");
  const [locCities, setLocCities] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const {
    signIn,
    signUp,
    signInWithGoogle,
    requestPasswordReset,
    sessionNotice,
    setSessionNotice,
  } = useAuth();

  const switchToLoginWithEmail = (registeredEmail) => {
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setFullName("");
    setLocState("");
    setLocCity("");
    setLocArea("");
    setLocCities([]);
    setError("");
    setAgreedToTerms(false);
    setEmail(registeredEmail);
    setIsLogin(true);
  };

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setFullName("");
    setLocState("");
    setLocCity("");
    setLocArea("");
    setLocCities([]);
    setAgreedToTerms(false);
  };

  const handleTabSwitch = (toLogin) => {
    setError("");
    setMessage("");
    clearForm();
    setIsLogin(toLogin);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSuspended(false);
    setSuspensionReason("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    try {
      if (isLogin) {
        const result = await signIn(trimmedEmail, trimmedPassword);
        if (!result?.success) {
          if (result?.suspended) {
            setSuspended(true);
            setSuspensionReason(result.error);
          } else {
            setError(result?.error || "Login failed. Please try again.");
          }
        }
      } else {
        // ── Validation first ──
        if (
          !trimmedUsername ||
          !trimmedFullName ||
          !locState ||
          !locCity ||
          !trimmedEmail ||
          !trimmedPassword
        ) {
          throw new Error(
            "Please fill in all fields including your state and city.",
          );
        }
        if (!USERNAME_REGEX.test(trimmedUsername)) {
          throw new Error(
            "Username can only contain letters, numbers, and underscores.",
          );
        }
        if (trimmedPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (trimmedPassword !== trimmedConfirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!agreedToTerms) {
          throw new Error(
            "You must agree to the Terms & Conditions to create an account.",
          );
        }

        const result = await signUp(
          trimmedEmail,
          trimmedPassword,
          trimmedUsername,
          trimmedFullName,
          buildLocation(locCity, locState, locArea),
        );

        if (!result?.success) {
          setError(result?.error || "Sign up failed. Please try again.");
        } else {
          setMessage("Account created! Please log in to continue.");
          switchToLoginWithEmail(trimmedEmail);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email to receive a reset link.");
      return;
    }
    setLoading(true);
    try {
      const result = await requestPasswordReset(trimmedEmail);
      if (result?.success) {
        setMessage("Password reset link sent. Check your inbox.");
      } else {
        setError(result?.error || "Unable to send reset email.");
      }
    } catch (err) {
      setError(err.message || "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const credential = credentialResponse?.credential;
      if (!credential) throw new Error("Missing Google credential");
      const result = await signInWithGoogle(credential);
      if (!result?.success) {
        setError(result?.error || "Google authentication failed.");
      }
    } catch (err) {
      setError(err?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <img
            src="/karmaswap-logo.png"
            alt="Karmaswap logo"
            className="auth-logo"
          />
          <h1>Karmaswap</h1>
          <p>Trade items, earn karma, build community</p>
        </div>

        <div className="auth-tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => handleTabSwitch(true)}
            type="button"
          >
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => handleTabSwitch(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="letters, numbers, underscores only"
                  required
                />
                {username && validateUsername(username.trim()) && (
                  <span className="field-hint field-hint--error">
                    {validateUsername(username.trim())}
                  </span>
                )}
                {username && !validateUsername(username.trim()) && (
                  <span className="field-hint field-hint--ok">
                    ✓ Username looks good
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <select
                  className="auth-location-select"
                  value={locState}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setLocState(selected);
                    setLocCity("");
                    const stateData = NIGERIA_STATES.find(
                      (s) => s.name === selected,
                    );
                    setLocCities(stateData?.cities || []);
                  }}
                  required
                >
                  <option value="">Select state</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  className="auth-location-select"
                  value={locCity}
                  onChange={(e) => setLocCity(e.target.value)}
                  disabled={!locState}
                  required
                  style={{ marginTop: "0.5rem" }}
                >
                  <option value="">Select city</option>
                  {locCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  className="auth-location-area"
                  type="text"
                  value={locArea}
                  onChange={(e) => setLocArea(e.target.value)}
                  placeholder="Area / street (optional)"
                  style={{ marginTop: "0.5rem" }}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-password-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="helper-row">
              <button
                type="button"
                className="link-btn"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* ── Terms & Conditions ── */}
          {!isLogin && (
            <div className="terms-row">
              <label className="terms-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setShowTermsModal(true)}
                  >
                    Terms & Conditions
                  </button>
                </span>
              </label>
            </div>
          )}

          {sessionNotice && sessionNotice.type === "suspended" && (
            <div className="suspension-notice">
              <h3>⛔ Account Suspended</h3>
              <p>{sessionNotice.message}</p>
            </div>
          )}

          {sessionNotice && sessionNotice.type !== "suspended" && (
            <div className="session-expired-notice">
              <button
                type="button"
                className="session-expired-dismiss"
                onClick={() => setSessionNotice(null)}
                aria-label="Dismiss"
              >
                ×
              </button>
              <h3>Session Expired</h3>
              <p>{sessionNotice.message}</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
          </button>

          <div className="auth-divider">
            <span />
            <p>or</p>
            <span />
          </div>
          <div className="google-btn-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in was cancelled.")}
              useOneTap={isLogin}
            />
          </div>
        </form>

        {!isLogin && (
          <div className="signup-bonus">
            🎉 New members start with 25 karma points!
          </div>
        )}
      </div>

      {/* ── Terms Modal ── */}
      {showTermsModal &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={() => setShowTermsModal(false)}
          >
            <div
              className="modal terms-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Terms & Conditions</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowTermsModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body terms-modal-body">
                <p className="terms-updated">Karma Swap Limited — RC 9238142</p>

                {TERMS_SECTIONS.map((section) => (
                  <React.Fragment key={section.title}>
                    <h4>{section.title}</h4>
                    <p>{section.body}</p>
                  </React.Fragment>
                ))}
              </div>
              <div className="modal-footer">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowTermsModal(false);
                  }}
                >
                  I Agree
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowTermsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
