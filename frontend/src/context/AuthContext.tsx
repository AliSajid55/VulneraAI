import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api, getToken, setToken, SESSION_EXPIRED_EVENT } from "../lib/api";
import type { AuthResponse, User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;

  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;

  forgotPassword: (email: string) => Promise<void>;
  verifyResetOTP: (email: string, code: string) => Promise<void>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;

  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    const data = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ) => {
    await api<{ message: string; email: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  };

  const verifyEmail = async (email: string, code: string) => {
    const data = await api<AuthResponse>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    setToken(data.token);
    setUser(data.user);
  };

  const resendVerificationCode = async (email: string) => {
    await api<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  // Request a password reset OTP.
  const forgotPassword = async (email: string) => {
    await api<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  // Verify the password reset OTP.
  const verifyResetOTP = async (email: string, code: string) => {
    await api<{ message: string }>("/api/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  };

  // Set a new password after OTP verification.
  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    await api<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email,
        code,
        new_password: newPassword,
      }),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        verifyEmail,
        resendVerificationCode,
        forgotPassword,
        verifyResetOTP,
        resetPassword,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
