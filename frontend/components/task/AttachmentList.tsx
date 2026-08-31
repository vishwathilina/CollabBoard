"use client";

import { useEffect, useState } from "react";
import { FileText, Image, Link as LinkIcon } from "lucide-react";
import { getUser } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import type { Attachment, User } from "@/types";
import type { AttachmentListProps } from "@/types/components";

function TypeIcon({ type }: { type: Attachment["type"] }) {
  const className = "h-4 w-4 shrink-0 text-muted";

  if (type === "image") return <Image className={className} aria-hidden />;
  if (type === "link") return <LinkIcon className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const loadData = async () => {
      try {
        const [attachments, allUsers] = await Promise.all([
          apiFetch<Attachment[]>(`/api/tasks/${taskId}/attachments`, { token }),
          apiFetch<User[]>("/api/users", { token }),
        ]);
        setItems(attachments);
        setUsers(allUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [taskId]);

  if (loading) {
    return <p className="text-sm text-muted">Loading attachments...</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">No attachments.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((attachment) => {
        const uploader = getUser(users, attachment.addedBy);
        const isExternal =
          attachment.url.startsWith("http://") ||
          attachment.url.startsWith("https://");

        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
          >
            <TypeIcon type={attachment.type} />
            <div className="min-w-0 flex-1">
              <a
                href={attachment.url}
                className="block truncate text-sm font-semibold text-fg hover:text-accent"
                {...(isExternal
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {attachment.name}
              </a>
              <p className="text-xs text-muted">
                Added by {uploader?.name ?? "Unknown"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
