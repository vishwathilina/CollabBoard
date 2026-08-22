import type { User } from "@/types";
import { AvatarGroup } from "@/components/ui/AvatarGroup";

type TopBarProps = {
  title: string;
  members?: User[];
};

export function TopBar({ title, members }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      {members && members.length > 0 ? <AvatarGroup users={members} max={4} /> : null}
    </header>
  );
}
