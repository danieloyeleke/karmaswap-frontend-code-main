import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { createPortal } from "react-dom";
import { NIGERIA_STATES, buildLocation } from "../utils/nigeriaLocations";

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

const TERMS_SECTIONS = [
  {
    title: "1. Definitions and Interpretation",
    body: `These Terms govern your access to and use of the KARMA SWAP digital marketplace ("Platform"). Key terms used throughout include "Karma Points" (proprietary, closed-loop digital credits with no monetary value, usable solely within the Platform), "Escrow" (a conditional facilitation mechanism, not a financial custodial service), "User" (any individual or entity using the Platform), and "Transaction" (any swap, exchange, or arrangement between Users). Headings are for convenience only and do not affect interpretation.`,
  },
  {
    title: "2. About Karma Swap Limited",
    body: `KARMA SWAP LIMITED ("KARMA") is a private company limited by shares incorporated under the laws of the Federal Republic of Nigeria, RC 9238142, registered office at 15, Jiboye Street, Apata, Ibadan, Oyo State. KARMA operates a technology-driven marketplace facilitating peer-to-peer exchange, barter, and distribution of goods and services. KARMA acts solely as a platform operator and intermediary — it does not act as a buyer, seller, agent, broker, or trustee in any Transaction, and does not take title to, possession of, or control over any goods or services exchanged.`,
  },
  {
    title: "3. Nature of the Platform",
    body: `The Platform enables Transactions through direct swaps and through Karma Points, which function solely as a closed-loop, non-monetary utility mechanism. Karma Points are not money, electronic money, deposits, stored value, cryptocurrency, or securities. KARMA does not provide financial, payment, or money transmission services, and does not accept deposits or facilitate conversion of Karma Points into fiat currency. Any escrow functionality is a conditional transaction facilitation tool only — not deposit-taking or custodial financial services.`,
  },
  {
    title: "4. Eligibility",
    body: `Access to the Platform is restricted to individuals at least 18 years of age with legal capacity to enter binding contracts under Nigerian law. By using the Platform, you represent that you meet these requirements. KARMA reserves the right to refuse access, restrict usage, or suspend any Account where eligibility requirements are not met or these Terms are breached.`,
  },
  {
    title: "5. Account Registration and Security",
    body: `You must provide accurate, current, and complete information when creating an Account, and are responsible for maintaining the confidentiality of your credentials and all activity under your Account. KARMA may verify your identity (KYC) at any time and may suspend, restrict, or terminate Accounts where information is false or misleading, fraud or unlawful activity is suspected, or where required for legal compliance.`,
  },
  {
    title: "6. Karma Points System",
    body: `Karma Points do not constitute money, legal tender, securities, or cryptocurrency. They have no cash or monetary value outside the Platform, are non-transferable outside it, and cannot be exchanged for cash or fiat equivalents. They exist solely as an in-platform mechanism for facilitating transactions. KARMA reserves the exclusive right to issue, adjust, suspend, limit, or revoke Karma Points at its sole discretion, including for system integrity, compliance, or suspected abuse.`,
  },
  {
    title: "7. Listing and Trading Rules",
    body: `All listings must be lawful, accurate, complete, and not misleading. You warrant that you have full right, title, or authority to list any item offered. Deceptive conduct or material omissions are prohibited. KARMA may review, suspend, modify, or remove any listing it reasonably believes breaches these Terms, without prior notice.`,
  },
  {
    title: "8. Trade and Exchange Process",
    body: `Transactions may occur through direct peer-to-peer swaps, exchanges using Karma Points, or escrow-supported transactions. Completion occurs only upon mutual confirmation or expiration of a designated dispute/settlement period without objection. KARMA does not guarantee performance of user obligations and is not responsible for losses arising from failed, disputed, or incomplete transactions between users.`,
  },
  {
    title: "9. User Obligations",
    body: `You agree to act honestly and in good faith in all Platform dealings, honour all agreed terms and commitments, maintain accurate information, and comply with all applicable laws. Failure to comply may result in suspension or termination of access.`,
  },
  {
    title: "10. Prohibited Items and Activities",
    body: `You must not list, offer, request, or trade illegal goods, stolen or counterfeit items, items requiring unobtained licences or approvals, or weapons, narcotics, or hazardous materials. Fraud, impersonation, listing manipulation, automated abuse, and circumvention of Platform controls are strictly prohibited.`,
  },
  {
    title: "11. Intellectual Property",
    body: `All intellectual property in the Platform — including software, source code, design, interface, databases, trademarks, and branding (excluding user-generated content) — remains the exclusive property of KARMA or its licensors. You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Platform for lawful, personal, non-commercial purposes only. Copying, reverse engineering, or unauthorised exploitation of the Platform is prohibited.`,
  },
  {
    title: "12. Limitation of Liability",
    body: `KARMA is not liable for the acts, omissions, negligence, or misconduct of any user or third party; failure or non-performance of transactions between users; Platform errors, interruptions, or downtime; third-party services; or unauthorised account access resulting from user negligence. KARMA's total aggregate liability is strictly limited to the total fees (if any) actually paid by the user within the twelve months preceding the claim.`,
  },
  {
    title: "13. Indemnity",
    body: `You agree to indemnify, defend, and hold harmless KARMA, its affiliates, directors, officers, employees, and agents from claims arising out of your access to or use of the Platform, any breach of these Terms, violation of applicable law, infringement of third-party rights, or any listing, content, or transaction you initiate. This indemnity survives termination of your Account.`,
  },
  {
    title: "14. Dispute Resolution",
    body: `Disputes are resolved through: (1) Amicable Settlement — informal good-faith communication between parties; (2) Internal Mediation — escalation to KARMA's internal dispute resolution team; (3) Arbitration — binding arbitration seated in Nigeria under the Arbitration and Mediation Act 2023, with the tribunal's decision being final and binding.`,
  },
  {
    title: "15. Governing Law",
    body: `These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.`,
  },
  {
    title: "16. Suspension and Termination",
    body: `KARMA may suspend, restrict, or terminate any Account, at its sole discretion and without prior notice where necessary, where a user breaches these Terms, engages in fraudulent or unlawful conduct, attempts to compromise Platform systems, or creates regulatory or reputational risk. KARMA may also act to comply with legal or regulatory requirements. Upon termination, access ceases immediately without prejudice to accrued rights or obligations.`,
  },
  {
    title: "17. Changes to Terms",
    body: `KARMA may amend these Terms at any time to reflect operational, legal, regulatory, or commercial changes. Material changes may be notified via the Platform or email, but it remains your responsibility to review the Terms periodically. Continued use after changes take effect constitutes acceptance.`,
  },
  {
    title: "18. Privacy and Data Protection",
    body: `Your use of the Platform is governed by KARMA's Privacy and Data Protection Policy, which explains how personal data is collected, used, and protected in accordance with the Nigeria Data Protection Act 2023. By using the Platform, you consent to such processing.`,
  },
  {
    title: "19. Data Collected",
    body: `KARMA may collect Identity Data (name, date of birth, government ID), Contact Data (email, phone, address), Transaction Data (listings, exchanges, history), Device and Usage Data (IP address, device identifiers), and Verification/KYC Data. Data is processed on the basis of consent, contractual necessity, legal obligation, or legitimate interest, in compliance with the NDPA 2023 and NDPR 2019.`,
  },
  {
    title: "20. Data Storage, Sharing, and Security",
    body: `KARMA implements technical and organisational measures including encryption, access controls, and security monitoring, though no system is completely secure. Data may be shared on a need-to-know basis with service providers, payment processors (e.g. Paystack), cloud/hosting providers, professional advisers, and regulatory authorities where legally required. All third-party processors must adhere to confidentiality and data protection standards.`,
  },
  {
    title: "21. Your Data Rights",
    body: `Subject to applicable law, you have the right to access, rectify, or request erasure of your personal data, object to certain processing, request data portability, and withdraw consent at any time. Data is retained only as long as necessary to fulfil its purpose or meet legal obligations, then securely deleted or anonymised.`,
  },
  {
    title: "22. Community Guidelines and Acceptable Use",
    body: `You agree to act honestly, treat other users with respect, provide accurate information, and comply with applicable laws. Safety in offline meet-ups is your responsibility — conduct exchanges in safe, public locations and verify items before completing trades. KARMA is not liable for risks arising from offline interactions. Fraud, impersonation, harassment, and manipulation of listings or ratings constitute material breaches of these Terms and may result in account suspension, content removal, or reporting to law enforcement.`,
  },
  {
    title: "23. Compliance Statement",
    body: `KARMA complies with the Nigeria Data Protection Act and NDPR, aligns with the Federal Competition and Consumer Protection Act, and adopts a risk-based approach to fraud prevention including identity verification and transaction monitoring. Karma Points are not legal tender, electronic money, redeemable for cash, or financial instruments. Platform use is restricted to persons 18 years and above. KARMA is not liable for user-to-user transactions, including the quality, delivery, or legality of items exchanged.`,
  },
  {
    title: "24. Contact",
    body: `KARMA SWAP LIMITED, Jiboye Street, Apata, Ibadan, Oyo State, Nigeria. For notices, complaints, or legal correspondence, contact support@karmaswap.com.`,
  },
];

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

  const { signIn, signUp, signInWithGoogle, requestPasswordReset } = useAuth();

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
            if (result?.error?.toLowerCase().includes("no account found")) {
              setMessage("Don't have an account? Switch to Sign Up above.");
            }
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

          {suspended && (
            <div className="suspension-notice">
              <h3>⛔ Account Suspended</h3>
              <p>{suspensionReason}</p>
              <p className="suspension-contact">
                Contact{" "}
                <a href="mailto:support@karmaswap.com">support@karmaswap.com</a>{" "}
                to appeal.
              </p>
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

// <div className="modal terms-modal" onClick={(e) => e.stopPropagation()}>

// </div>
