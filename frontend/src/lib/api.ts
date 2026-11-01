// Small fetch wrapper for the Flask backend.
// The token is kept in localStorage so the user stays logged in after a refresh.

export const API_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_URL || "http://127.0.0.1:5000";

const TOKEN_KEY = "polyguard_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the session only lasts until the page is closed.
  }
}

/** Fired when the backend says the session is no longer valid. */
export const SESSION_EXPIRED_EVENT = "polyguard:session-expired";

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Could not reach the server. Check that the backend is running at ${API_URL}.`,
      0
    );
  }

  if (response.status === 401 && token) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const data = await response.json();
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      // Not JSON; keep the default message.
    }
    throw new ApiError(message, response.status);
  }

  return response;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await request(path, options);
  return (await response.json()) as T;
}

/** Download a file (e.g. CSV export) from an authenticated endpoint. */
export async function downloadFile(path: string, fallbackName: string) {
  const response = await request(path);
  const blob = await response.blob();

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
