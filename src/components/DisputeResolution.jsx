import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const ISSUE_TYPES = [
  { label: "Item not received",    value: "ITEM_NOT_RECEIVED" },
  { label: "Item damaged / broken", value: "ITEM_NOT_AS_DESCRIBED" },
  { label: "Not as described",     value: "ITEM_NOT_AS_DESCRIBED" },
  { label: "Seller unresponsive",  value: "SELLER_UNRESPONSIVE" },
  { label: "Other",                value: "OTHER" },
];

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function DisputeResolution({ onBack }) {
  const { escrowId } = useParams();
  const navigate = useNavigate();

  const [issueType, setIssueType]     = useState(ISSUE_TYPES[0].value);
  const [notes, setNotes]             = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [previews, setPreviews]       = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  const handleEvidence = (files) => {
    const selected = Array.from(files).slice(0, 3);
    setEvidenceFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Please describe the issue before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const evidenceImages = await Promise.all(evidenceFiles.map(toBase64));
      await api.post(`/disputes/${escrowId}`, {
        reason: issueType,
        description: notes.trim(),
        evidenceImages,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to submit dispute. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <section className="order-tracking-page">
        <div className="order-tracking-shell">
          <div className="dispute-success">
            <div className="dispute-success-icon">⚖️</div>
            <h2>Dispute Submitted</h2>
            <p>
              Our moderators will review your evidence and reach out within
              24–48 hours. Escrow remains frozen until a decision is made.
            </p>
            <button className="btn-primary" onClick={() => navigate("/trades")}>
              Back to My Trades
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="order-tracking-page">
      <div className="order-tracking-shell">
        <div className="order-tracking-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div>
            <span className="detail-section-label">Dispute</span>
            <h2>Dispute Resolution</h2>
            <p>Escrow is frozen. Our moderators will review your evidence.</p>
          </div>
        </div>

        <form className="checkout-card" onSubmit={handleSubmit}>
          <div className="tracking-status-card warning">
            <strong>Escrow Frozen</strong>
            <p>Funds cannot move until moderators decide.</p>
          </div>

          <label className="checkout-label">Issue type</label>
          <select
            className="checkout-input"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            {ISSUE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <label className="checkout-label">
            Photo evidence (up to 3 images)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="checkout-input"
            onChange={(e) => handleEvidence(e.target.files)}
          />
          {previews.length > 0 && (
            <div className="dispute-previews">
              {previews.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Evidence ${idx + 1}`}
                  className="evidence-photo"
                />
              ))}
            </div>
          )}

          <label className="checkout-label">Explain the issue</label>
          <textarea
            className="checkout-textarea"
            rows="4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What went wrong? Be as specific as possible."
          />

          {error && <div className="error-message">{error}</div>}

          <div className="tracking-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Dispute"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}