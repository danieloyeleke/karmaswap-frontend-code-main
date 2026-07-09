export const DAILY_LOGIN_KARMA_POINTS = 1;
export const SEVEN_DAY_STREAK_KARMA_POINTS = 25;
export const THIRTY_DAY_STREAK_KARMA_POINTS = 100;

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStorageKey = (userId) => `karma_daily_login_state:${userId || "guest"}`;

const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getDayDifference = (olderDateKey, newerDateKey) => {
  const older = parseDateKey(olderDateKey);
  const newer = parseDateKey(newerDateKey);
  if (!older || !newer) return Number.POSITIVE_INFINITY;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const olderMidnight = new Date(
    older.getFullYear(),
    older.getMonth(),
    older.getDate()
  ).getTime();
  const newerMidnight = new Date(
    newer.getFullYear(),
    newer.getMonth(),
    newer.getDate()
  ).getTime();

  return Math.round((newerMidnight - olderMidnight) / millisecondsPerDay);
};

const readState = (userId) => {
  if (!userId) {
    return {
      lastLoginDate: null,
      lastClaimDate: null,
      streakCount: 0,
    };
  }

  try {
    const rawValue = localStorage.getItem(getStorageKey(userId));
    if (!rawValue) {
      return {
        lastLoginDate: null,
        lastClaimDate: null,
        streakCount: 0,
      };
    }

    const parsed = JSON.parse(rawValue);
    return {
      lastLoginDate: parsed.lastLoginDate || null,
      lastClaimDate: parsed.lastClaimDate || null,
      streakCount: Number(parsed.streakCount) || 0,
    };
  } catch {
    return {
      lastLoginDate: null,
      lastClaimDate: null,
      streakCount: 0,
    };
  }
};

const writeState = (userId, state) => {
  if (!userId) return;
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
};

const getClaimAmountForStreak = (streakCount) => {
  if (streakCount > 0 && streakCount % 30 === 0) {
    return THIRTY_DAY_STREAK_KARMA_POINTS;
  }
  if (streakCount > 0 && streakCount % 7 === 0) {
    return SEVEN_DAY_STREAK_KARMA_POINTS;
  }
  return DAILY_LOGIN_KARMA_POINTS;
};

export const registerDailyLogin = (userId) => {
  const todayKey = getTodayKey();
  const state = readState(userId);

  if (state.lastLoginDate === todayKey) {
    return {
      ...state,
      canClaimToday: state.lastClaimDate !== todayKey,
      claimAmount: getClaimAmountForStreak(state.streakCount),
    };
  }

  const dayDifference = getDayDifference(state.lastLoginDate, todayKey);
  const nextStreakCount = dayDifference === 1 ? state.streakCount + 1 : 1;

  const nextState = {
    ...state,
    lastLoginDate: todayKey,
    streakCount: nextStreakCount,
  };

  writeState(userId, nextState);

  return {
    ...nextState,
    canClaimToday: nextState.lastClaimDate !== todayKey,
    claimAmount: getClaimAmountForStreak(nextStreakCount),
  };
};

export const claimDailyLoginBonus = (userId) => {
  const todayKey = getTodayKey();
  const state = registerDailyLogin(userId);

  if (state.lastClaimDate === todayKey) {
    return {
      ...state,
      canClaimToday: false,
      claimAmount: 0,
      awardedAmount: 0,
    };
  }

  const nextState = {
    ...state,
    lastClaimDate: todayKey,
  };

  writeState(userId, nextState);

  return {
    ...nextState,
    canClaimToday: false,
    claimAmount: 0,
    awardedAmount: getClaimAmountForStreak(nextState.streakCount),
  };
};

export const getDailyLoginBonusState = (userId) => {
  const state = registerDailyLogin(userId);
  return {
    streakCount: state.streakCount,
    canClaimToday: state.canClaimToday,
    claimAmount: state.claimAmount,
    lastClaimDate: state.lastClaimDate,
  };
};
