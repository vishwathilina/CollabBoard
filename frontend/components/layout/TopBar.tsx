"use client";

import { MessageSquare, Users } from "lucide-react";
import type { User, PresenceUser } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarGroup } from "@/components/ui/AvatarGroup";

type TopBarProps = {
  title: string;
  members?: User[];
  onlineUsers?: PresenceUser[];
  onOpenChat?: () => void;
};

export function TopBar({
  title,
  members = [],
  onlineUsers = [],
  onOpenChat,
}: TopBarProps) {
  const visibleOnline = onlineUsers.slice(0, 4);
  const extraOnline = onlineUsers.length - visibleOnline.length;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Online Now Section */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-surface-2/60 py-1 px-2.5 border border-border/60">
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
              title="Online presence active"
            />
            <span className="text-xs font-medium text-muted">
              {onlineUsers.length} online
            </span>
            <div className="flex items-center">
              {visibleOnline.map((user, idx) => (
                <span
                  key={user.userId || user.id || idx}
                  className={idx === 0 ? "relative inline-flex" : "-ml-2 relative inline-flex"}
                  title={`${user.name} (online)`}
                >
                  <Avatar
                    user={{
                      id: user.userId || user.id || "",
                      name: user.name,
                      email: user.email,
                      avatarColor: user.avatarColor || "#6366F1",
                      avatarUrl: user.avatarUrl || undefined,
                    }}
                    size="xs"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-bg" />
                </span>
              ))}
              {extraOnline > 0 && (
                <span className="-ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-2 text-[9px] font-semibold text-muted">
                  +{extraOnline}
                </span>
              )}
            </div>
          </div>
        )}

        {/* All Workspace Members (if not redundant with online) */}
        {members.length > 0 && onlineUsers.length === 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <AvatarGroup users={members} max={4} />
          </div>
        )}

        {/* Workspace Chat Button */}
        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            aria-label="Open workspace chat"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-xs hover:bg-surface-2 hover:border-muted transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-accent" />
            <span>Workspace chat</span>
          </button>
        )}
      </div>
    </header>
  );
}
