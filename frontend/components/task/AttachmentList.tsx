"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Image, Link as LinkIcon, Trash2, ExternalLink } from "lucide-react";
import { getUser } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import { UploadButton } from "@/lib/uploadthing";
import type { Attachment, User } from "@/types";
import type { AttachmentListProps } from "@/types/components";

function getCurrentUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setCurrentUserId(getCurrentUserId(token));

    try {
      const [attachments, allUsers] = await Promise.all([
        apiFetch<Attachment[]>(`/api/tasks/${taskId}/attachments`, { token }),
        apiFetch<User[]>("/api/users", { token }),
      ]);
      setItems(Array.isArray(attachments) ? attachments : []);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (attachmentId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
        token,
      });
      setItems((prev) => prev.filter((a) => a.id !== attachmentId));
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to delete attachment.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <div className="rounded-lg bg-red-950/30 p-2.5 text-xs text-red-400 border border-red-900/40">
          {errorMessage}
        </div>
      )}

      {/* Upload button area */}
      <div className="rounded-xl border border-dashed border-border bg-surface-2/50 p-4 flex flex-col items-center justify-center text-center">
        <UploadButton
          endpoint="taskAttachment"
          input={{ taskId }}
          headers={() => {
            const token = getToken();
            const h: Record<string, string> = {};
            if (token) {
              h.Authorization = `Bearer ${token}`;
            }
            return h;
          }}
          onClientUploadComplete={() => {
            setErrorMessage(null);
            loadData();
          }}
          onUploadError={(error: Error) => {
            console.error("Upload error:", error);
            setErrorMessage(`Upload error: ${error.message}`);
          }}
          appearance={{
            button:
              "ut-ready:bg-accent ut-uploading:cursor-not-allowed bg-accent text-accent-fg text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity",
            allowedContent: "text-[11px] text-muted mt-1",
          }}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading attachments...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No attachments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((attachment) => {
            const uploader = getUser(users, attachment.addedBy);
            const isUploader = currentUserId === attachment.addedBy;

            return (
              <li
                key={attachment.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 hover:border-accent/40 transition-colors"
              >
                <TypeIcon type={attachment.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-semibold text-fg hover:text-accent transition-colors"
                      title={attachment.name}
                    >
                      {attachment.name}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                  </div>
                  <p className="text-xs text-muted">
                    Added by {uploader?.name ?? "Unknown"}
                  </p>
                </div>

                {isUploader && (
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment.id)}
                    aria-label={`Delete ${attachment.name}`}
                    title="Delete attachment"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-surface"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
