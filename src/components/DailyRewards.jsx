import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Flame, Gift, Star, Zap } from "lucide-react";
import {
  claimDailyReward,
  claimSevenDayBonus,
  claimThirtyDayBonus,
  getClaimsStatus,
} from "../api/claims";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const INITIAL_STATUS = {
  currentStreak: 0,
  hasClaimedToday: false,
  hasClaimedSevenDayBonus: false,
  hasClaimedThirtyDayBonus: false,
  canClaimDaily: false,
  canClaimSevenDayBonus: false,
  canClaimThirtyDayBonus: false,
};

const CLAIM_AMOUNT_BY_TYPE = { daily: 1, weekly: 25, monthly: 100 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const readMessage = (error, fallback) =>
  (typeof error?.response?.data === "string" ? error.response.data : "") ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  if (typeof value === "number") return value === 1;
  return fallback;
};

// ─── REWARD CARD ─────────────────────────────────────────────────────────────

function RewardCard({ icon: Icon, eyebrow, title, reward, description, disabled, loading, claimed, onClick }) {
  return (
    <div className={`dr-card ${claimed ? "dr-card-claimed" : ""} ${!disabled && !claimed ? "dr-card-available" : ""}`}>
      <div className="dr-card-icon">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="dr-card-eyebrow">{eyebrow}</div>
      <div className="dr-card-reward">{reward}</div>
      <h3 className="dr-card-title">{title}</h3>
      <p className="dr-card-desc">{description}</p>
      <button
        type="button"
        className={`dr-card-btn ${claimed ? "dr-card-btn-claimed" : ""}`}
        disabled={disabled || loading || claimed}
        onClick={onClick}
      >
        {loading ? (
          <span className="dr-card-btn-loading">
            <span className="dr-spinner" /> Claiming...
          </span>
        ) : claimed ? (
          <span className="dr-card-btn-inner">
            <CheckCircle size={15} /> Claimed
          </span>
        ) : (
          "Claim Reward"
        )}
      </button>
    </div>
  );
}

// ─── STREAK DOTS ─────────────────────────────────────────────────────────────

function StreakDots({ current }) {
  return (
    <div className="dr-streak-dots">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={`dr-streak-dot ${i < current ? "filled" : ""} ${i === current - 1 ? "current" : ""}`}
        >
          {i < current ? <CheckCircle size={12} /> : <span>{i + 1}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DailyRewards({ profile, onRewardsUpdated }) {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [loading, setLoading] = useState(true);
  const [claimingType, setClaimingType] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentStreak = useMemo(() => {
    const s = toNumber(status.currentStreak);
    if (s > 0) return s;
    return toNumber(profile?.currentStreak ?? profile?.current_streak ?? 0);
  }, [profile, status.currentStreak]);

  const weeklyProgress = Math.min((currentStreak / 7) * 100, 100);

  const dailyEligible = useMemo(() =>
    toBoolean(status.canClaimDaily) || !status.hasClaimedToday,
    [status.canClaimDaily, status.hasClaimedToday]
  );

  const weeklyEligible = useMemo(() =>
    toBoolean(status.canClaimSevenDayBonus) ||
    (currentStreak >= 7 && !status.hasClaimedSevenDayBonus),
    [currentStreak, status.canClaimSevenDayBonus, status.hasClaimedSevenDayBonus]
  );

  const monthlyEligible = useMemo(() =>
    toBoolean(status.canClaimThirtyDayBonus) ||
    (currentStreak >= 30 && !status.hasClaimedThirtyDayBonus),
    [currentStreak, status.canClaimThirtyDayBonus, status.hasClaimedThirtyDayBonus]
  );

  const normalizeStatus = (raw) => ({
    ...INITIAL_STATUS,
    ...raw,
    currentStreak: toNumber(raw?.currentStreak ?? raw?.current_streak),
    hasClaimedToday: toBoolean(raw?.hasClaimedToday ?? raw?.has_claimed_today),
    hasClaimedSevenDayBonus: toBoolean(
      raw?.hasClaimedSevenDayBonus ?? raw?.hasClaimed7DayBonus ??
      raw?.has_claimed_seven_day_bonus ?? raw?.has_claimed_7_day_bonus
    ),
    hasClaimedThirtyDayBonus: toBoolean(
      raw?.hasClaimedThirtyDayBonus ?? raw?.hasClaimed30DayBonus ??
      raw?.has_claimed_thirty_day_bonus ?? raw?.has_claimed_30_day_bonus
    ),
    canClaimDaily: toBoolean(raw?.canClaimDaily ?? raw?.can_claim_daily),
    canClaimSevenDayBonus: toBoolean(
      raw?.canClaimSevenDayBonus ?? raw?.canClaim7DayBonus ??
      raw?.can_claim_seven_day_bonus ?? raw?.can_claim_7_day_bonus
    ),
    canClaimThirtyDayBonus: toBoolean(
      raw?.canClaimThirtyDayBonus ?? raw?.canClaim30DayBonus ??
      raw?.can_claim_thirty_day_bonus ?? raw?.can_claim_30_day_bonus
    ),
  });

  const loadStatus = async ({ preserveMessage = true } = {}) => {
    setLoading(true);
    if (!preserveMessage) { setError(""); setSuccess(""); }
    try {
      const raw = await getClaimsStatus();
      setStatus(normalizeStatus(raw));
    } catch (err) {
      setError(readMessage(err, "Unable to load daily rewards."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const runClaim = async (type, action) => {
    setClaimingType(type);
    setError("");
    setSuccess("");
    try {
      const result = await action();
      // Update status locally first — no full page reload
      setStatus((prev) => normalizeStatus({
        ...prev,
        hasClaimedToday: type === "daily" ? true : prev.hasClaimedToday,
        hasClaimedSevenDayBonus: type === "weekly" ? true : prev.hasClaimedSevenDayBonus,
        hasClaimedThirtyDayBonus: type === "monthly" ? true : prev.hasClaimedThirtyDayBonus,
        currentStreak: type === "daily"
          ? toNumber(result?.currentStreak ?? prev.currentStreak + 1)
          : prev.currentStreak,
      }));
      // Then background-refresh for accuracy
      loadStatus({ preserveMessage: true });
      // Notify parent without forcing full page reload
      onRewardsUpdated?.(result);

      const amount =
        result?.amountAwarded ?? result?.awardedAmount ??
        CLAIM_AMOUNT_BY_TYPE[type] ?? 0;
      setSuccess(
        type === "daily"
          ? `+${amount} Karma claimed! Keep your streak going 🔥`
          : type === "weekly"
          ? `+${amount} Karma — 7-day streak bonus claimed! 🎉`
          : `+${amount} Karma — 30-day streak bonus claimed! 🏆`
      );
    } catch (err) {
      setError(readMessage(err, "Unable to process reward claim."));
    } finally {
      setClaimingType("");
    }
  };

  return (
    <section className="dr-panel">
      {/* Header */}
      <div className="dr-header">
        <div className="dr-header-text">
          <span className="dr-eyebrow">Daily Rewards</span>
          <h2>Keep your Karma streak alive</h2>
          <p>Claim daily to build your streak and unlock bigger bonuses.</p>
        </div>
        <div className="dr-streak-badge">
          <Flame size={24} className="dr-flame" />
          <div>
            <strong>{currentStreak}</strong>
            <span>{currentStreak === 1 ? "day" : "days"} streak</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="dr-success">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      {/* Weekly progress */}
      <div className="dr-progress-block">
        <div className="dr-progress-header">
          <span>Weekly progress</span>
          <strong>{Math.min(currentStreak, 7)} / 7 days</strong>
        </div>
        <div className="dr-progress-bar">
          <div className="dr-progress-fill" style={{ width: `${weeklyProgress}%` }} />
        </div>
        <StreakDots current={Math.min(currentStreak, 7)} />
      </div>

      {/* Reward cards */}
      <div className="dr-cards">
        <RewardCard
          icon={Zap}
          eyebrow="Daily Claim"
          title="Daily Karma"
          reward="+1 Karma"
          description="Claim once per day to maintain your streak and keep earning."
          disabled={!dailyEligible || status.hasClaimedToday}
          claimed={status.hasClaimedToday}
          loading={claimingType === "daily" || loading}
          onClick={() => runClaim("daily", claimDailyReward)}
        />
        <RewardCard
          icon={Star}
          eyebrow="7-Day Bonus"
          title="Weekly Streak"
          reward="+25 Karma"
          description="Earn a big bonus after 7 consecutive claim days."
          disabled={!weeklyEligible || status.hasClaimedSevenDayBonus}
          claimed={status.hasClaimedSevenDayBonus}
          loading={claimingType === "weekly" || loading}
          onClick={() => runClaim("weekly", claimSevenDayBonus)}
        />
        <RewardCard
          icon={Gift}
          eyebrow="Monthly Bonus"
          title="30-Day Champion"
          reward="+100 Karma"
          description="Claim every day for a month and earn the ultimate Karma bonus."
          disabled={!monthlyEligible || status.hasClaimedThirtyDayBonus}
          claimed={status.hasClaimedThirtyDayBonus}
          loading={claimingType === "monthly" || loading}
          onClick={() => runClaim("monthly", claimThirtyDayBonus)}
        />
      </div>
    </section>
  );
}