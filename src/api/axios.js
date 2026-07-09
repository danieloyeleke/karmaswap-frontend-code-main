import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

const normalizeToken = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.replace(/^Bearer\s+/i, "").trim();
};

//attach token automatically
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

// In axios.js — add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common.Authorization;
      window.location.href = "/"; // or trigger logout
    }
    return Promise.reject(error);
  }
);

export default api;


