import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { clickriseApi, type ClickRiseTask } from "../api/clickrise";
import { cn } from "../lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground/40",
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  in_progress: { label: "In Progress", dot: "bg-blue-500" },
  todo: { label: "To Do", dot: "bg-muted-foreground" },
  review: { label: "In Review", dot: "bg-purple-500" },
  done: { label: "Done", dot: "bg-emerald-500" },
};

function TaskItem({ task }: { task: ClickRiseTask }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors">
      <span
        className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", priorityColors[task.priority] || "bg-muted-foreground/40")}
        title={task.priority}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-foreground/80 leading-snug line-clamp-2">{task.title}</p>
        <span className="text-[10px] text-muted-foreground truncate">{task.projectName}</span>
      </div>
    </div>
  );
}

function TaskGroup({
  status,
  tasks,
  defaultOpen = true,
}: {
  status: string;
  tasks: ClickRiseTask[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = statusConfig[status] || statusConfig.todo;

  if (tasks.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
        <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
        <span>{config.label}</span>
        <span className="ml-auto text-muted-foreground/60">{tasks.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SidebarClickRise() {
  const { selectedCompanyId } = useCompany();
  const [open, setOpen] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clickrise", "tasks", selectedCompanyId],
    queryFn: () => clickriseApi.tasks(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000,
    retry: 1,
  });

  if (error && !data) return null;

  const summary = data?.summary;

  return (
    <div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-1.5">
          <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform", open && "rotate-90")} />
          <span className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60">
            ClickRise
          </span>
          {summary && summary.total > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground/60">{summary.total}</span>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {isLoading && (
              <div className="px-3 py-3 text-[11px] text-muted-foreground animate-pulse">
                Loading tasks...
              </div>
            )}

            {data && (
              <>
                <TaskGroup status="in_progress" tasks={data.grouped.in_progress} />
                <TaskGroup status="todo" tasks={data.grouped.todo} />
                <TaskGroup status="review" tasks={data.grouped.review} />
                {showDone ? (
                  <TaskGroup status="done" tasks={data.grouped.done} defaultOpen={false} />
                ) : (
                  data.grouped.done.length > 0 && (
                    <button
                      onClick={() => setShowDone(true)}
                      className="px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      Show {data.grouped.done.length} completed...
                    </button>
                  )
                )}
                {data.tasks.length === 0 && (
                  <div className="px-3 py-3 text-[11px] text-muted-foreground">
                    No tasks
                  </div>
                )}
              </>
            )}

            <a
              href="https://clickrise.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open ClickRise</span>
            </a>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
