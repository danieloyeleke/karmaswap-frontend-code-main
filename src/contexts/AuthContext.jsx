import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api, { normalizeToken } from "../api/axios";

const AuthContext = createContext();

// const normalizeToken = (value) => {
//   if (!value || typeof value !== "string") return "";
//   return value.replace(/^Bearer\s+/i, "").trim();
// };

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // treat unreadable token as expired
  }
};

const normalizeUser = (data = {}) => {
  if (!data || typeof data !== "object") return null;
  const id =
    data.id ??
    data.userId ??
    data.user_id ??
    data.uuid ??
    data.sub ??
    data?.user?.id ??
    null;

  return {
    ...data,
    id: id ?? null,
    email: data.email ?? data?.user?.email ?? "",
    username: data.username ?? data?.user?.username ?? "",
  };
};

const buildFallbackProfile = (userData) => ({
  id:
    userData?.id ??
    userData?.userId ??
    userData?.user_id ??
    userData?.uuid ??
    null,
  username: userData?.username || userData?.email?.split("@")[0] || "User",
  bio: "",
  karmaBalance: userData?.karmaBalance ?? userData?.karma_balance ?? 25,
  totalKarmaEarned:
    userData?.totalKarmaEarned ?? userData?.total_karma_earned ?? 25,
  totalKarmaSpent:
    userData?.totalKarmaSpent ?? userData?.total_karma_spent ?? 0,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchProfile = useCallback(async (userData) => {
    if (!userData) {
      setProfile(null);
      return null;
    }

    try {
      const response = await api.get("/profile/me");
      setProfile(response.data);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const message =
        (typeof error?.response?.data === "string"
          ? error.response.data
          : "") ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "";

      if (status === 400 && /profile not found/i.test(message)) {
        const fallbackProfile = buildFallbackProfile(userData);
        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      console.error("Failed to fetch profile:", error);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchProfile(user);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, fetchProfile]);

  useEffect(() => {
    const loadSession = async () => {
      const expiredMessage = sessionStorage.getItem("sessionExpiredMessage");
      if (expiredMessage) {
        setSessionExpired(true);
        sessionStorage.removeItem("sessionExpiredMessage");
      }

      const storedToken = localStorage.getItem("token");
      const storedRefreshToken = localStorage.getItem("refreshToken");
      const storedUser = localStorage.getItem("user");

      if (!storedToken || !storedUser) {
        setAuthReady(true);
        setLoading(false);
        return;
      }

      if (isTokenExpired(storedToken) && !storedRefreshToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setAuthReady(true);
        setLoading(false);
        return;
      }

      try {
        const token = normalizeToken(storedToken);
        const userData = normalizeUser(JSON.parse(storedUser));
        setUser(userData);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        await fetchProfile(userData);
      } catch (error) {
        console.error("Failed to parse user:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setUser(null);
        setProfile(null);
      } finally {
        setAuthReady(true);
        setLoading(false);
      }
    };

    loadSession();
  }, [fetchProfile]);

  const persistSession = async (responseData, fallbackEmail = "") => {
    const rawToken =
      responseData?.token ||
      responseData?.accessToken ||
      responseData?.jwt ||
      (typeof responseData === "string" ? responseData : "");
    const token = normalizeToken(rawToken);
    const refreshToken = responseData?.refreshToken || "";
    const userData = normalizeUser(
      responseData.user || {
        email: responseData.email || fallbackEmail,
        id: responseData.id || responseData.userId,
        username: responseData.username || "",
      },
    );
    if (!token)
      return { success: false, error: "No authentication token received" };

    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(userData);
    setSessionExpired(false);
    await fetchProfile(userData);
    setAuthReady(true);
    return { success: true, data: responseData };
  };

  const signIn = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      return await persistSession(response.data, email);
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);

      if (error.response?.status === 400 || error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Extract just the message from formats like: 401 UNAUTHORIZED "message here"
        const raw =
          error.response?.data?.message ||
          error.response?.data ||
          "Invalid email or password";

        const cleaned = String(raw)
          .replace(/^\d+\s+\w+\s+"?/, "")
          .replace(/"$/, "")
          .trim();

        return {
          success: false,
          error: cleaned || "Invalid email or password",
        };
      }
      if (error.response?.status === 404) {
        return {
          success: false,
          error: "Login endpoint not found. Check your API URL.",
        };
      }

      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed. Please try again.",
      };
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // ignore — clear local session regardless of backend result
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    delete api.defaults.headers.common.Authorization;
    setUser(null);
    setProfile(null);
    setAuthReady(false);
  };

  const signUp = async (email, password, username, fullName, location) => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    try {
      const response = await api.post("/auth/register", {
        email,
        password,
        username,
        fullName,
        location,
        referralCode: referralCode || null,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Registration error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          (typeof error?.response?.data === "string" && error.response.data) ||
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Registration failed",
      };
    }
  };

  const signInWithGoogle = async (credential) => {
    try {
      const response = await api.post("/auth/google", { credential });
      return await persistSession(response.data);
    } catch (error) {
      console.error(
        "Google auth error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Google authentication failed",
      };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      await api.post("/auth/forgot-password", { email });
      return { success: true };
    } catch (error) {
      console.error(
        "Password reset error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to send reset email",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        logout,
        sessionExpired,
        setSessionExpired,
        requestPasswordReset,
        signInWithGoogle,
        refreshProfile: () => fetchProfile(user),
        authReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
