"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { apiFetch, getToken } from "@/lib/api";
import type { User, Workspace } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [meData, wsData] = await Promise.all([
          apiFetch<User>("/api/auth/me", { token }),
          apiFetch<Workspace[]>("/api/workspaces", { token })
        ]);
        
        setUser(meData);
        setName(meData.name || "");
        setAvatarColor(meData.avatarColor || "#C6F135");
        setTitle(meData.title || "");
        setBio(meData.bio || "");
        setAvatarUrl(meData.avatarUrl || "");

        // Filter workspaces where user is a member
        const myWorkspaces = wsData.filter(w => w.memberIds.includes(meData.id));
        setWorkspaces(myWorkspaces);
      } catch (err) {
        console.error("Failed to load profile", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ text: "", type: "" });
    const token = getToken();
    if (!token) return;

    try {
      const updatedUser = await apiFetch<User>("/api/users/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ name, avatarColor, title, bio, avatarUrl }),
      });
      setUser(updatedUser);
      setProfileMsg({ text: "Profile updated successfully!", type: "success" });
    } catch (err: any) {
      setProfileMsg({ text: err.message || "Failed to update profile", type: "error" });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg({ text: "", type: "" });
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        token,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwdMsg({ text: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPwdMsg({ text: err.message || "Failed to change password", type: "error" });
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Profile" />
        <div className="flex-1 p-6 text-muted">Loading profile...</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Profile Settings" />
      <div className="flex-1 overflow-auto bg-bg p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header Section */}
          <div className="flex items-center gap-6 rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div 
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-bg"
                style={{ backgroundColor: user?.avatarColor || "#C6F135" }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-fg">{user?.name}</h1>
              <p className="text-muted">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-accent/20 px-2 py-1 text-xs font-semibold text-accent uppercase">
                  {user?.orgRole || "developer"}
                </span>
              </div>
            </div>
          </div>

          {/* Workspaces Section */}
          <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-fg">Workspaces</h2>
            {workspaces.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workspaces.map(ws => (
                  <div key={ws.id} className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-fg">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ws.color }} />
                    {ws.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">You are not a member of any workspaces.</p>
            )}
          </div>

          {/* Edit Profile Form */}
          <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-fg">Edit Profile</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">Avatar Color</label>
                  <div className="flex gap-2">
                    <input
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">Job Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">Avatar URL (optional)</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent min-h-[80px]"
                />
              </div>

              {profileMsg.text && (
                <div className={`rounded-lg px-3 py-2 text-sm ${profileMsg.type === 'error' ? 'bg-red-950/30 text-red-400' : 'bg-green-950/30 text-green-400'}`}>
                  {profileMsg.text}
                </div>
              )}

              <Button type="submit" variant="primary">
                Save Profile
              </Button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-fg">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {pwdMsg.text && (
                <div className={`rounded-lg px-3 py-2 text-sm ${pwdMsg.type === 'error' ? 'bg-red-950/30 text-red-400' : 'bg-green-950/30 text-green-400'}`}>
                  {pwdMsg.text}
                </div>
              )}

              <Button type="submit" variant="outline">
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
