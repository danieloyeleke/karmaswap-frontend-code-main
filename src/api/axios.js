import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

const normalizeToken = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.replace(/^Bearer\s+/i, "").trim();
};

// GET /items, GET /items/search, and GET /items/{id} are public.
// GET /items/my, and any non-GET on /items or /items/{id}, stay gated.
const isPublicItemsRoute = (method, url) => {
  if (method?.toUpperCase() !== "GET" || !url) return false;

  const path = url.split("?")[0];
  if (path === "/items" || path === "/items/search") return true;

  const segments = path.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "items" && segments[1] !== "my";
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

const clearSessionAndRedirect = (message, type = "expired") => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  delete api.defaults.headers.common.Authorization;
  if (message) {
    sessionStorage.setItem("sessionNotice", JSON.stringify({ message, type }));
  }
  window.location.href = "/";
};

// Refresh failed and the original request was to a public route: clear the
// dead token and retry anonymously instead of bouncing a guest to login.
const retryAnonymously = (originalRequest) => {
  delete originalRequest.headers.Authorization;
  return api(originalRequest);
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isExpired = error.response?.data?.error === "TOKEN_EXPIRED";
    const isSuspended =
      error.response?.status === 403 &&
      error.response?.data?.error === "ACCOUNT_SUSPENDED";
    const isAuthEndpoint = /\/auth\/(login|register|google)(\?|$)/.test(
      originalRequest?.url || ""
    );
    const isPublicRoute = isPublicItemsRoute(
      originalRequest?.method,
      originalRequest?.url
    );

    // Suspended — no point retrying, go straight to redirect
    if (isSuspended) {
      clearSessionAndRedirect(
        "Your account has been suspended. Contact support@karmaswap.com to appeal.",
        "suspended"
      );
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && isExpired && !originalRequest._retry) {
      if (isRefreshing) {
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
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common.Authorization;
        if (isPublicRoute) {
          return retryAnonymously(originalRequest);
        }
        clearSessionAndRedirect("Your session has expired, please log in again.");
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refresh`,
          { refreshToken }
        );
        const newToken = normalizeToken(data.token);
        const newRefreshToken = normalizeToken(data.refreshToken);

        localStorage.setItem("token", newToken);
        if (newRefreshToken && newRefreshToken !== "undefined" && newRefreshToken !== "null") {
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (isPublicRoute) {
          isRefreshing = false;
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          delete api.defaults.headers.common.Authorization;
          return retryAnonymously(originalRequest);
        }

        const backendMessage = refreshError.response?.data?.error;
        const wasSuspended = backendMessage === "Your account has been suspended.";
        clearSessionAndRedirect(
          backendMessage || "Your session has expired, please log in again.",
          wasSuspended ? "suspended" : "expired"
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isExpired && !isAuthEndpoint && !isPublicRoute) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default api;
export { normalizeToken };