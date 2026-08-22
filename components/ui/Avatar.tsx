import type { AvatarProps } from "@/types/components";

const sizeClass: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ user, size = "md" }: AvatarProps) {
  return (
    <span
      title={user.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-on-accent ${sizeClass[size]}`}
      style={{ backgroundColor: user.avatarColor }}
    >
      {initials(user.name)}
    </span>
  );
}
