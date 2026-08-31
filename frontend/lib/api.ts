const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  
  // Only add Bearer token if it exists
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || (body && body.success === false)) {
    throw new Error(body?.error?.message || `API request failed with status ${response.status}`);
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
