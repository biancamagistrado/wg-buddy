import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAsync } from "../hooks";
import { useHousehold } from "../components/Layout";
import { Avatar, Badge, EmptyState, ErrorBox, Spinner, formatDueDate } from "../components/ui";
import { STATUS_LABELS, type Task, type TaskStatus } from "../types";

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

export default function Tasks() {
  const { household } = useHousehold();
  const { data: tasks, loading, error, reload, setData } = useAsync(
    () => api.tasks.list(household.id),
    [household.id],
  );

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | "ALL">("ALL");

  const visible = useMemo(() => {
    return (tasks ?? [])
      .filter((t) => filter === "ALL" || t.status === filter)
      .sort((a, b) => {
        // Finished tasks drop to the bottom, whatever their deadline was.
        if ((a.status === "DONE") !== (b.status === "DONE")) {
          return a.status === "DONE" ? 1 : -1;
        }
        // Then soonest deadline first, with undated tasks last.
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [tasks, filter]);

  async function updateStatus(task: Task, status: TaskStatus) {
    setData((tasks ?? []).map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api.tasks.update(task.id, { status });
    } catch {
      reload();
    }
  }

  async function remove(task: Task) {
    setData((tasks ?? []).filter((t) => t.id !== task.id));
    try {
      await api.tasks.remove(task.id);
    } catch {
      reload();
    }
  }

  if (loading) return <Spinner label="Loading tasks…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {(["ALL", ...STATUSES] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {value === "ALL" ? "All" : STATUS_LABELS[value]}
            </button>
          ))}
        </div>

        <button onClick={() => setShowForm((v) => !v)} className="btn-primary shrink-0">
          {showForm ? "Cancel" : "New task"}
        </button>
      </div>

      {showForm && (
        <TaskForm
          onCreated={(task) => {
            setData([task, ...(tasks ?? [])]);
            setShowForm(false);
          }}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon="✅"
          title={filter === "ALL" ? "No tasks yet" : "Nothing here"}
          hint={
            filter === "ALL"
              ? "Add a chore, give it a deadline, and assign it to someone."
              : "Try a different filter."
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <TaskCard key={task.id} task={task} onStatus={updateStatus} onDelete={remove} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskForm({ onCreated }: { onCreated: (task: Task) => void }) {
  const { household, currentMemberId } = useHousehold();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentMemberId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      onCreated(
        await api.tasks.create(household.id, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          dueDate: dueDate || null,
          assigneeId: assigneeId || null,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <div>
        <label className="label" htmlFor="task-title">
          Task
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Clean the kitchen"
          maxLength={80}
          className="input"
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="task-due">
            Deadline
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="task-assignee">
            Assign to
          </label>
          <select
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="input"
          >
            <option value="">Anyone</option>
            {household.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="task-notes">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="task-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className="input resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving || !title.trim()} className="btn-primary w-full sm:w-auto">
        {saving ? "Adding…" : "Add task"}
      </button>
    </form>
  );
}

function TaskCard({
  task,
  onStatus,
  onDelete,
}: {
  task: Task;
  onStatus: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
}) {
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const isDone = task.status === "DONE";

  return (
    <li className="card group p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => onStatus(task, isDone ? "TODO" : "DONE")}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          aria-label={`Mark ${task.title} as ${isDone ? "not done" : "done"}`}
        />

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isDone ? "text-slate-400 line-through" : ""}`}>
            {task.title}
          </p>
          {task.notes && <p className="mt-0.5 text-xs text-slate-500">{task.notes}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {due && !isDone && <Badge tone={due.tone}>{due.text}</Badge>}
            {task.status === "IN_PROGRESS" && <Badge tone="amber">In progress</Badge>}
            {task.assignee ? (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Avatar member={task.assignee} size="xs" />
                {task.assignee.name}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Unassigned</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <select
            value={task.status}
            onChange={(e) => onStatus(task, e.target.value as TaskStatus)}
            className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600"
            aria-label={`Status of ${task.title}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => onDelete(task)}
            className="rounded px-1.5 py-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${task.title}`}
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}
