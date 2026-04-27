import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMeApi, loginApi, registerApi } from "../api/client";
import LoadingState from "../components/common/LoadingState";

const AuthContext = createContext(null);

const routeByRole = (role) => {
  if (role === "LANDLORD") return "/landlord/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "TRANSPORT_MANAGER") return "/transport-manager/dashboard";
  return "/student/dashboard";
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  const setSession = (token, userData) => {
    localStorage.setItem("unilife_token", token);
    localStorage.setItem("unilife_user", JSON.stringify(userData));
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem("unilife_token");
    localStorage.removeItem("unilife_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("unilife_token");
      if (!token) return;

      const { data } = await getMeApi();
      setUser(data.user);
      localStorage.setItem("unilife_user", JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error("Failed to refresh user:", err);
      return null;
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const token = localStorage.getItem("unilife_token");
        const cachedUser = localStorage.getItem("unilife_user");

        if (!token) {
          setBootLoading(false);
          return;
        }

        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (err) {
            console.error("Failed to parse cached user:", err);
            clearSession();
          }
        }

        try {
          const { data } = await getMeApi();
          setUser(data.user);
          localStorage.setItem("unilife_user", JSON.stringify(data.user));
        } catch (err) {
          console.error("Failed to fetch user:", err);
          clearSession();
        }
      } catch (err) {
        console.error("Boot error:", err);
        setBootError(err.message || "Failed to initialize app");
        clearSession();
      } finally {
        setBootLoading(false);
      }
    };

    boot();
  }, []);

  // Periodic refresh for vendors with pending verification
  useEffect(() => {
    if (!user || user.role !== "VENDOR" || user.vendorVerificationStatus === "VERIFIED") {
      return;
    }

    const interval = setInterval(() => {
      console.log("🔄 Checking vendor verification status...");
      refreshUser();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Periodic refresh for transport managers with pending verification
  useEffect(() => {
    if (!user || user.role !== "TRANSPORT_MANAGER" || user.transportManagerVerificationStatus === "VERIFIED") {
      return;
    }

    const interval = setInterval(() => {
      console.log("🔄 Checking transport manager verification status...");
      refreshUser();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (payload) => {
    const { data } = await loginApi(payload);
    setSession(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await registerApi(payload);
    setSession(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    clearSession();
  };

  const value = useMemo(
    () => ({
      user,
      bootLoading,
      bootError,
      login,
      register,
      logout,
      setUser,
      refreshUser,
      routeByRole,
    }),
    [user, bootLoading, bootError]
  );

  // Show loading screen while booting
  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  // Show error screen if boot failed
  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md px-8 py-6 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-lg font-bold text-slate-900">Failed to Load</div>
          <div className="mt-2 text-sm text-slate-600">{bootError}</div>
          <button
            className="btn-primary mt-6"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}