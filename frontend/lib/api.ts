const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string | null;
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

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
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
    throw new ApiError(response.status, message, body?.error?.code, body?.error?.details);
  }

  return body?.data as T;
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
