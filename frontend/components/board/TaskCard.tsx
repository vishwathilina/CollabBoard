import type { TaskCardProps, BadgeProps } from "@/types/components";
import { Badge } from "@/components/ui/Badge";
import { AvatarGroup } from "@/components/ui/AvatarGroup";
import { formatDate } from "@/lib/format";

export function TaskCard({ task, members, highlighted, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-xl border bg-surface p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        highlighted ? "border-accent" : "border-border hover:border-border"
      }`}
    >
      <p className="text-sm font-semibold text-fg">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge tone={`priority-${task.priority}` as BadgeProps["tone"]}>{task.priority}</Badge>
        <span className="text-xs text-muted">{formatDate(task.dueDate)}</span>
      </div>
      <div className="mt-2">
        <AvatarGroup users={members} max={3} />
      </div>
      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] group-focus:grid-rows-[1fr] transition-all duration-200">
        <div className="overflow-hidden">
          <p className="pt-2 text-xs text-muted line-clamp-3">{task.description}</p>
          {members.length > 0 && (
            <div className="pt-2 flex flex-col gap-1">
              {members.map((member) => (
                <span key={member.id} className="text-xs text-muted flex items-center gap-2">
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: member.avatarColor || '#ccc' }} 
                  />
                  {member.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
