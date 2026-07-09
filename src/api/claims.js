import api from "./axios";

const postWithFallback = async (primaryPath, fallbackPath) => {
  try {
    const response = await api.post(primaryPath);
    return response.data;
  } catch (error) {
    const isNotFound = error?.response?.status === 404;
    if (isNotFound && fallbackPath) {
      const fallbackResponse = await api.post(fallbackPath);
      return fallbackResponse.data;
    }
    throw error;
  }
};

export const getClaimsStatus = async () => {
  const response = await api.get("/claims/status");
  return response.data;
};

export const claimDailyReward = async () => {
  const response = await api.post("/claims/daily");
  return response.data;
};

// Align with backend reference endpoints. If the service still exposes the older
// `/claims/bonus/*` paths, fall back to them so the buttons remain functional.
export const claimSevenDayBonus = async () =>
  postWithFallback("/claims/7-day", "/claims/bonus/7-day");

export const claimThirtyDayBonus = async () =>
  postWithFallback("/claims/30-day", "/claims/bonus/30-day");
