import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { useHousehold } from "../components/Layout";
import { Avatar, Badge, EmptyState, ErrorBox, Spinner, formatDueDate } from "../components/ui";
import type { Task } from "../types";

/** The weekly summary: what's left to buy and what's due in the next seven days. */
export default function Overview() {
  const { household } = useHousehold();
  const { data, loading, error, reload } = useAsync(
    () => api.households.overview(household.id),
    [household.id],
  );

  if (loading) return <Spinner label="Building your week…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const { shopping, tasks } = data;
  const nothingToDo =
    shopping.open === 0 && tasks.overdue.length === 0 && tasks.thisWeek.length === 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          to="shopping"
          label="Still to buy"
          value={shopping.open}
          hint={shopping.done > 0 ? `${shopping.done} in the basket` : "Shopping list"}
          icon="🛒"
        />
        <StatCard
          to="tasks"
          label="Open tasks"
          value={tasks.openTotal}
          hint={tasks.overdue.length > 0 ? `${tasks.overdue.length} overdue` : "Household tasks"}
          icon="✅"
          alert={tasks.overdue.length > 0}
        />
      </div>

      {nothingToDo && (
        <EmptyState
          icon="🎉"
          title="All caught up"
          hint="Nothing to buy and nothing due this week. Enjoy it while it lasts."
        />
      )}

      {tasks.overdue.length > 0 && (
        <TaskSection title="Overdue" tone="red" tasks={tasks.overdue} />
      )}
      {tasks.thisWeek.length > 0 && (
        <TaskSection title="This week" tone="indigo" tasks={tasks.thisWeek} />
      )}
      {tasks.noDueDate.length > 0 && (
        <TaskSection title="No deadline" tone="slate" tasks={tasks.noDueDate} />
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Household</h2>
        <div className="card flex flex-wrap gap-3 p-4">
          {household.members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            household.members.map((m) => (
              <span key={m.id} className="flex items-center gap-2 text-sm">
                <Avatar member={m} />
                {m.name}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  to,
  label,
  value,
  hint,
  icon,
  alert,
}: {
  to: string;
  label: string;
  value: number;
  hint: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <Link to={to} className="card p-4 transition hover:border-indigo-300 hover:shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span aria-hidden>{icon}</span>
      </div>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      <p className={`mt-0.5 text-xs ${alert ? "font-medium text-red-600" : "text-slate-400"}`}>
        {hint}
      </p>
    </Link>
  );
}

function TaskSection({
  title,
  tone,
  tasks,
}: {
  title: string;
  tone: "red" | "indigo" | "slate";
  tasks: Task[];
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {title}
        <Badge tone={tone}>{tasks.length}</Badge>
      </h2>
      <ul className="card divide-y divide-slate-100">
        {tasks.map((task) => {
          const due = task.dueDate ? formatDueDate(task.dueDate) : null;
          return (
            <li key={task.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {due && <Badge tone={due.tone}>{due.text}</Badge>}
                  {task.status === "IN_PROGRESS" && <Badge tone="amber">In progress</Badge>}
                </div>
              </div>
              {task.assignee && <Avatar member={task.assignee} size="xs" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
