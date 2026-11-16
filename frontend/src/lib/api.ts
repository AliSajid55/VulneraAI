
// ==================================================
// VulneraAI - Centralized API Wrapper
// HttpOnly Cookies + PostgreSQL Sessions + CSRF
// ==================================================

// --------------------------------------------------
// API Configuration
// --------------------------------------------------

const env = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

export const API_URL = (
  env?.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// --------------------------------------------------
// CSRF Configuration
// --------------------------------------------------

const CSRF_HEADER = "X-CSRF-Token";
const CSRF_ENDPOINT = "/api/auth/csrf-token";

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const CSRF_PROTECTED_METHODS = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

// --------------------------------------------------
// API Error
// --------------------------------------------------

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --------------------------------------------------
// Legacy JWT Compatibility
// --------------------------------------------------

/** @deprecated Authentication now uses HttpOnly cookies. */
export function getToken(): string | null {
  return null;
}

/** @deprecated Authentication now uses HttpOnly cookies. */
export function setToken(_token: string | null): void {
  // Intentionally disabled.
}

// --------------------------------------------------
// Session Expiration
// --------------------------------------------------

export const SESSION_EXPIRED_EVENT =
  "vulneraai:session-expired";

// --------------------------------------------------
// Clear CSRF Token
// --------------------------------------------------

export function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
}

// --------------------------------------------------
// Fetch CSRF Token
// --------------------------------------------------

async function fetchCsrfToken(): Promise<string> {
  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${CSRF_ENDPOINT}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error("CSRF request failed:", error);

    throw new ApiError(
      `Cannot connect to ${API_URL}. Check backend availability and browser CORS errors.`,
      0
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `CSRF initialization failed (${response.status}).`,
      response.status
    );
  }

  let data: { csrf_token?: string };

  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "Invalid CSRF response from backend.",
      500
    );
  }

  if (
    typeof data.csrf_token !== "string" ||
    !data.csrf_token
  ) {
    throw new ApiError(
      "Backend did not return a valid CSRF token.",
      500
    );
  }

  csrfToken = data.csrf_token;

  return csrfToken;
}

// --------------------------------------------------
// Get CSRF Token
// --------------------------------------------------

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenPromise) {
    const pending = fetchCsrfToken();

    csrfTokenPromise = pending;

    try {
      return await pending;
    } finally {
      if (csrfTokenPromise === pending) {
        csrfTokenPromise = null;
      }
    }
  }

  return csrfTokenPromise;
}

// --------------------------------------------------
// Capture Rotated CSRF Token
// --------------------------------------------------

async function updateCsrfTokenFromResponse(
  response: Response
): Promise<void> {
  const contentType =
    response.headers.get("Content-Type") || "";

  if (!contentType.includes("application/json")) {
    return;
  }

  try {
    const data = await response.clone().json();

    if (
      typeof data.csrf_token === "string" &&
      data.csrf_token
    ) {
      csrfToken = data.csrf_token;
    }
  } catch {
    // Ignore invalid JSON.
  }
}

// --------------------------------------------------
// Public Authentication Endpoints
// --------------------------------------------------

function isPublicAuthEndpoint(path: string): boolean {
  const endpoint = path.split("?")[0];

  return [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/verify-reset-otp",
    "/api/auth/reset-password",
  ].includes(endpoint);
}

// --------------------------------------------------
// Session Invalidation
// --------------------------------------------------

function invalidatesCurrentSession(
  path: string,
  method: string
): boolean {
  const endpoint = path.split("?")[0];

  return (
    endpoint === "/api/auth/logout" ||
    endpoint === "/api/auth/change-password" ||
    endpoint === "/api/auth/reset-password" ||
    (
      endpoint === "/api/auth/me" &&
      method === "DELETE"
    )
  );
}

// --------------------------------------------------
// Main Request Function
// --------------------------------------------------

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (
    options.method || "GET"
  ).toUpperCase();

  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Set JSON Content-Type only for JSON string bodies.
  // Never manually set Content-Type for FormData.

  if (
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Attach CSRF token to unsafe methods.

  if (CSRF_PROTECTED_METHODS.has(method)) {
    const token = await getCsrfToken();

    headers.set(CSRF_HEADER, token);
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        method,
        headers,
        credentials: "include",
      }
    );
  } catch (error) {
    console.error(
      `API request failed: ${method} ${path}`,
      error
    );

    throw new ApiError(
      `Network request failed for ${API_URL}${path}. Check the backend, CORS configuration and browser console.`,
      0
    );
  }

  // Handle expired sessions.

  if (
    response.status === 401 &&
    !isPublicAuthEndpoint(path)
  ) {
    clearCsrfToken();

    window.dispatchEvent(
      new Event(SESSION_EXPIRED_EVENT)
    );
  }

  // Handle API errors.

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    try {
      const data = await response.json();

      if (typeof data.error === "string") {
        message = data.error;
      } else if (typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      // Use default error message.
    }

    if (response.status === 403) {
      clearCsrfToken();
    }

    throw new ApiError(message, response.status);
  }

  // Capture rotated CSRF token.

  await updateCsrfTokenFromResponse(response);

  // Clear token after session invalidation.

  if (invalidatesCurrentSession(path, method)) {
    clearCsrfToken();
  }

  return response;
}

// --------------------------------------------------
// Public API Function
// --------------------------------------------------

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await request(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// --------------------------------------------------
// File Download
// --------------------------------------------------

export async function downloadFile(
  path: string,
  fallbackName: string
): Promise<void> {
  const response = await request(path);

  const blob = await response.blob();

  const disposition =
    response.headers.get("Content-Disposition") || "";

  const match = disposition.match(
    /filename\*?=(?:UTF-8''|")?([^";]+)/i
  );

  const filename = match
    ? decodeURIComponent(match[1].replace(/"/g, ""))
    : fallbackName;

  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
