"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { apiFetch, setToken } from "@/lib/api";
import type { User } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarColor, setAvatarColor] = useState("#C6F135");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ user: User; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, avatarColor }),
      });

      setToken(data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="CollabBoard Register" />
      <div className="flex h-full min-h-screen items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-2 p-8 shadow-sm">
          <h1 className="mb-6 text-center text-xl font-semibold text-fg">
            Create an account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-fg"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Ada Lovelace"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-fg"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="ada@collabboard.local"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-fg"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
                minLength={8}
              />
            </div>

            <div>
              <label
                htmlFor="avatarColor"
                className="mb-1 block text-sm font-medium text-fg"
              >
                Avatar Color
              </label>
              <div className="flex gap-2">
                <input
                  id="avatarColor"
                  type="color"
                  value={avatarColor}
                  onChange={(e) => setAvatarColor(e.target.value)}
                  className="h-9 w-12 rounded border border-border bg-surface p-1 cursor-pointer"
                />
                <input
                  type="text"
                  value={avatarColor}
                  onChange={(e) => setAvatarColor(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-full flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg uppercase focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
