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

// Ensure token is retrieved safely on client side
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("collabboard_token");
  }
  return null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("collabboard_token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("collabboard_token");
  }
}

export function getUploadThingUrl(): string {
  return `${API_URL}/api/uploadthing`;
}

function notifyErrorToast(status: number, message: string) {
  if (typeof window === "undefined") return;

  let toastType: "error" | "conflict" = "error";
  let toastMsg = message;

  if (status === 401) {
    toastMsg = message || "Authentication required. Please sign in.";
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
    
    // Consistent toasts for 401/403/409 unless explicitly suppressed
    if (!silentToast && (response.status === 401 || response.status === 403 || response.status === 409)) {
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

