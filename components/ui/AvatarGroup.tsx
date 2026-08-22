import type { AvatarGroupProps } from "@/types/components";
import { Avatar } from "@/components/ui/Avatar";

export function AvatarGroup({ users, max = 3 }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center">
      {visible.map((user, index) => (
        <span
          key={user.id}
          className={index === 0 ? "inline-flex" : "-ml-2 inline-flex"}
        >
          <Avatar user={user} size="sm" />
        </span>
      ))}
      {overflow > 0 ? (
        <span className="-ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-[10px] font-semibold text-muted">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
