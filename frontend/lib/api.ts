export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string | null;
  silentToast?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Safely checks whether a JWT token string has expired based on its payload `exp` claim.
 * Non-JWT tokens (e.g. test mocks) or tokens without `exp` are treated as non-expired.
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const decoded =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("binary");
    const payload = JSON.parse(decoded);
    if (typeof payload.exp === "number") {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

// Ensure token is retrieved safely on client side, automatically clearing expired tokens
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("collabboard_token");
    if (token) {
      if (isTokenExpired(token)) {
        removeToken();
        return null;
      }
      return token;
    }
  }
  return null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("collabboard_token", token);
  }
  lastAuthToastTime = 0;
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("collabboard_token");
  }
}

export function getUploadThingUrl(): string {
  return `${API_URL}/api/uploadthing`;
}

let lastAuthToastTime = 0;
const AUTH_TOAST_THROTTLE_MS = 5000;

export function resetAuthToastThrottle() {
  lastAuthToastTime = 0;
}

function notifyErrorToast(status: number, message: string) {
  if (typeof window === "undefined") return;

  let toastType: "error" | "conflict" = "error";
  let toastMsg = message;

  if (status === 401) {
    const now = Date.now();
    if (now - lastAuthToastTime < AUTH_TOAST_THROTTLE_MS) {
      return; // Deduplicate repeated auth toasts within throttle window
    }
    lastAuthToastTime = now;
    toastMsg = "Session expired. Please sign in again.";
  } else if (status === 403) {
    toastMsg = message || "Forbidden: You do not have permission for this action.";
  } else if (status === 409) {
    toastType = "conflict";
    toastMsg = message || "Conflict: Resource was modified by another user.";
  }

  window.dispatchEvent(
    new CustomEvent("collabboard-toast", {
      detail: { message: toastMsg, type: toastType },
    })
  );
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, silentToast = false, ...rest } = options;

  // Auto-attach token from localStorage if not explicitly supplied
  const effectiveToken = token !== undefined ? token : getToken();
  const authHeader: Record<string, string> = effectiveToken
    ? { Authorization: `Bearer ${effectiveToken}` }
    : {};

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(headers as Record<string, string> | undefined),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || (body && body.success === false)) {
    const message = body?.error?.message || `API request failed with status ${response.status}`;
    
    if (response.status === 401) {
      // Clear expired / invalid token
      removeToken();

      // Notify auth state listeners to redirect to login
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("collabboard-auth-expired"));
      }

      if (!silentToast) {
        notifyErrorToast(response.status, message);
      }

      throw new ApiError(response.status, message, body?.error?.code, body?.error?.details);
    }

    // Consistent toasts for 403/409 unless explicitly suppressed
    if (!silentToast && (response.status === 403 || response.status === 409)) {
      notifyErrorToast(response.status, message);
    }

    throw new ApiError(response.status, message, body?.error?.code, body?.error?.details);
  }

  return body?.data as T;
}

/**
 * Typed helpers for standard HTTP verbs
 */
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

