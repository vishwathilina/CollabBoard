import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getUser } from "@/lib/format";
import { messages, users } from "@/mocks/data";
import type { MessageChannelProps } from "@/types/components";

export function MessageChannel({ taskId }: MessageChannelProps) {
  const thread = messages
    .filter((message) => message.taskId === taskId)
    .slice()
    .sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        a.id.localeCompare(b.id),
    );

  return (
    <div className="flex flex-col">
      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
        {thread.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : (
          thread.map((message) => {
            const author = getUser(users, message.authorId);

            return (
              <div key={message.id} className="flex gap-2.5">
                {author ? (
                  <Avatar user={author} size="sm" />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted"
                  >
                    ?
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-fg">
                      {author?.name ?? "Unknown"}
                    </span>
                    <time
                      className="text-xs text-muted"
                      dateTime={message.createdAt}
                    >
                      {formatDate(message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg">
                    {message.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <input
        type="text"
        disabled
        placeholder="Coming in the backend phase"
        aria-label="Message composer"
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted placeholder:text-muted disabled:cursor-not-allowed"
      />
    </div>
  );
}
