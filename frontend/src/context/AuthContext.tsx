
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  clearCsrfToken,
  SESSION_EXPIRED_EVENT,
} from "../lib/api";

import type { User } from "../types";

// ==================================================
// VulneraAI - Authentication Context
// ==================================================
//
// Authentication:
// - HttpOnly session cookies
// - PostgreSQL-backed server-side sessions
// - CSRF protection handled by centralized api.ts
// - No JWT in localStorage
// - No Authorization Bearer tokens
//
// ==================================================

// --------------------------------------------------
// Authentication Response Types
// --------------------------------------------------

interface AuthSessionResponse {
  message: string;
  user: User;
  csrf_token?: string;
}

interface AuthMessageResponse {
  message: string;
}

// --------------------------------------------------
// Context Types
// --------------------------------------------------

interface AuthContextValue {
  user: User | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;

  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;

  verifyEmail: (
    email: string,
    code: string
  ) => Promise<void>;

  resendVerificationCode: (
    email: string
  ) => Promise<void>;

  forgotPassword: (email: string) => Promise<void>;

  verifyResetOTP: (
    email: string,
    code: string
  ) => Promise<void>;

  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;

  logout: () => void;

  setUser: (user: User) => void;
}

// --------------------------------------------------
// Create Context
// --------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ==================================================
// AUTH PROVIDER
// ==================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  // ------------------------------------------------
  // Clear Local Authentication State
  // ------------------------------------------------

  const clearLocalAuth = useCallback(() => {
    setUser(null);
  }, []);

  // ------------------------------------------------
  // Initialize Authentication
  // ------------------------------------------------
  //
  // On application startup:
  // 1. Ask backend whether a valid session exists.
  // 2. Browser automatically sends HttpOnly cookie.
  // 3. Backend verifies session using PostgreSQL.
  // 4. Restore user if authenticated.
  //
  // CSRF initialization is handled automatically
  // by api.ts before the first unsafe request.
  //
  // ------------------------------------------------

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const data = await api<{ user: User }>(
          "/api/auth/me"
        );

        if (active) {
          setUser(data.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  // ------------------------------------------------
  // Session Expiration Listener
  // ------------------------------------------------

  useEffect(() => {
    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      clearLocalAuth
    );

    return () => {
      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        clearLocalAuth
      );
    };
  }, [clearLocalAuth]);

  // ==================================================
  // LOGIN
  // ==================================================

  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    const data = await api<AuthSessionResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    // Backend sets the HttpOnly session cookie.
    // api.ts captures any rotated CSRF token.

    setUser(data.user);
  };

  // ==================================================
  // SIGNUP
  // ==================================================

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    await api<AuthMessageResponse>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      }
    );
  };

  // ==================================================
  // EMAIL VERIFICATION
  // ==================================================

  const verifyEmail = async (
    email: string,
    code: string
  ): Promise<void> => {
    const data = await api<AuthSessionResponse>(
      "/api/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
        }),
      }
    );

    // If backend creates an authenticated session
    // after verification, restore the user.

    setUser(data.user);
  };

  // ==================================================
  // RESEND VERIFICATION CODE
  // ==================================================

  const resendVerificationCode = async (
    email: string
  ): Promise<void> => {
    await api<AuthMessageResponse>(
      "/api/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({
          email,
        }),
      }
    );
  };

  // ==================================================
  // FORGOT PASSWORD
  // ==================================================

  const forgotPassword = async (
    email: string
  ): Promise<void> => {
    await api<AuthMessageResponse>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({
          email,
        }),
      }
    );
  };

  // ==================================================
  // VERIFY PASSWORD RESET OTP
  // ==================================================

  const verifyResetOTP = async (
    email: string,
    code: string
  ): Promise<void> => {
    await api<AuthMessageResponse>(
      "/api/auth/verify-reset-otp",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
        }),
      }
    );
  };

  // ==================================================
  // RESET PASSWORD
  // ==================================================

  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    await api<AuthMessageResponse>(
      "/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword,
        }),
      }
    );

    // Password reset may invalidate the current session.
    // Backend must enforce session invalidation.

    setUser(null);

    clearCsrfToken();
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout = useCallback((): void => {
    // Immediately update frontend state.

    setUser(null);

    // Backend destroys the server-side session.
    // api.ts automatically:
    // - Obtains CSRF token
    // - Sends HttpOnly session cookie
    // - Attaches X-CSRF-Token
    // - Clears CSRF token after successful logout

    void api<AuthMessageResponse>(
      "/api/auth/logout",
      {
        method: "POST",
      }
    ).catch(() => {
      // Clear local CSRF state even if logout fails.
      clearCsrfToken();
    });
  }, []);

  // ==================================================
  // PROVIDER
  // ==================================================

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

// ==================================================
// CUSTOM AUTH HOOK
// ==================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
