import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/login",
}));

describe("LoginPage (RTL Unit Test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("renders the login form elements, demo accounts hint, and register link", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/ada@collabboard.local/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create one/i })).toBeInTheDocument();
  });

  it("allows entering email and password", () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "ada@collabboard.local" } });
    fireEvent.change(passwordInput, { target: { value: "CollabBoard!1" } });

    expect(emailInput.value).toBe("ada@collabboard.local");
    expect(passwordInput.value).toBe("CollabBoard!1");
  });

  it("successfully signs in, stores token, and navigates to /dashboard", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          token: "jwt-test-token-12345",
          user: {
            id: "u-ada",
            name: "Ada Lovelace",
            email: "ada@collabboard.local",
            avatarColor: "#C6F135",
          },
        },
      }),
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "ada@collabboard.local" } });
    fireEvent.change(passwordInput, { target: { value: "CollabBoard!1" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(localStorage.getItem("collabboard_token")).toBe("jwt-test-token-12345");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on invalid credentials (401)", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      }),
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "wrong@collabboard.local" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
