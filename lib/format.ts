import type { User } from "@/types";

function asDate(iso: string): Date {
  return new Date(iso);
}

export function formatDate(iso: string): string {
  return asDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = asDate(startIso);
  const end = asDate(endIso);
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth) {
    const month = start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    return `${month} ${start.getUTCDate()}–${end.getUTCDate()}`;
  }

  return `${formatDate(startIso)}–${formatDate(endIso)}`;
}

export function getUser(users: User[], id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function getUsers(users: User[], ids: string[]): User[] {
  return ids
    .map((id) => getUser(users, id))
    .filter((user): user is User => user !== undefined);
}
