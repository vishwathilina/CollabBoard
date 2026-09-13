import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isTokenExpired,
  getToken,
  setToken,
  removeToken,
  apiFetch,
  resetAuthToastThrottle,
} from "@/lib/api";

function createJwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "u123",
      email: "test@example.com",
      exp: expSeconds,
    })
  );
  const signature = "dummy_signature";
  return `${header}.${payload}.${signature}`;
}

describe("JWT Expiration & Token Management", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthToastThrottle();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("isTokenExpired", () => {
    it("returns true for null or empty string", () => {
      expect(isTokenExpired("")).toBe(true);
      expect(isTokenExpired(null as any)).toBe(true);
    });

    it("returns false for non-JWT mock strings", () => {
      expect(isTokenExpired("jwt-test-token-12345")).toBe(false);
      expect(isTokenExpired("simple-mock-token")).toBe(false);
    });

    it("returns true for a token with past exp", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createJwt(pastExp);
      expect(isTokenExpired(token)).toBe(true);
    });

    it("returns false for a token with future exp", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const token = createJwt(futureExp);
      expect(isTokenExpired(token)).toBe(false);
    });
  });

  describe("getToken auto-cleanup", () => {
    it("returns the token when valid", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const validToken = createJwt(futureExp);
      setToken(validToken);

      expect(getToken()).toBe(validToken);
      expect(localStorage.getItem("collabboard_token")).toBe(validToken);
    });

    it("removes expired token from localStorage and returns null", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = createJwt(pastExp);
      localStorage.setItem("collabboard_token", expiredToken);

      expect(getToken()).toBeNull();
      expect(localStorage.getItem("collabboard_token")).toBeNull();
    });
  });

  describe("apiFetch 401 handling", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it("removes token and dispatches collabboard-auth-expired on 401", async () => {
      const token = "active-token";
      setToken(token);

      const eventSpy = vi.fn();
      window.addEventListener("collabboard-auth-expired", eventSpy);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or expired token." },
        }),
      });

      await expect(apiFetch("/api/workspaces")).rejects.toThrow("Invalid or expired token.");

      expect(localStorage.getItem("collabboard_token")).toBeNull();
      expect(eventSpy).toHaveBeenCalledTimes(1);

      window.removeEventListener("collabboard-auth-expired", eventSpy);
    });

    it("throttles multiple 401 toast events to prevent alert spamming", async () => {
      setToken("some-token");

      const toastSpy = vi.fn();
      window.addEventListener("collabboard-toast", toastSpy);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or expired token." },
        }),
      });

      // Fire 3 simultaneous requests (simulating /workspaces, /auth/me, /users)
      await Promise.allSettled([
        apiFetch("/api/workspaces"),
        apiFetch("/api/auth/me"),
        apiFetch("/api/users"),
      ]);

      // Only 1 toast event should be emitted due to throttling
      expect(toastSpy).toHaveBeenCalledTimes(1);

      window.removeEventListener("collabboard-toast", toastSpy);
    });
  });
});
