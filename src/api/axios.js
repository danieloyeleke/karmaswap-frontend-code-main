import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

const normalizeToken = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.replace(/^Bearer\s+/i, "").trim();
};

api.interceptors.request.use(
  (config) => {
    const storedToken = localStorage.getItem("token");
    const token = normalizeToken(storedToken);
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

const clearSessionAndRedirect = (message) => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  delete api.defaults.headers.common.Authorization;
  if (message) sessionStorage.setItem("sessionExpiredMessage", message);
  window.location.href = "/";
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isExpired = error.response?.data?.error === "TOKEN_EXPIRED";

    // TOKEN_EXPIRED 401 — refresh and retry
    if (error.response?.status === 401 && isExpired && !originalRequest._retry) {
      if (isRefreshing) {
        // a refresh is already in flight — queue this request behind it
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        clearSessionAndRedirect("Your session has expired, please log in again.");
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refresh`,
          { refreshToken }
        );
        const newToken = normalizeToken(data.token);
        localStorage.setItem("token", newToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSessionAndRedirect("Your session has expired, please log in again.");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // any other 401 — old behavior, unchanged
    if (error.response?.status === 401 && !isExpired) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default api;
export { normalizeToken };