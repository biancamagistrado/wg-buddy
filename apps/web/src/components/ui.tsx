import type { ReactNode } from "react";
import type { Member } from "../types";

/**
 * The member's photo, falling back to a coloured circle with their initial.
 * Used everywhere a person appears, so setting a photo updates the whole app.
 */
export function Avatar({ member, size = "sm" }: { member: Member; size?: "sm" | "xs" | "lg" }) {
  const dimensions =
    size === "xs" ? "h-5 w-5 text-[10px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-7 w-7 text-xs";

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        title={member.name}
        className={`${dimensions} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {member.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-medium">{message}</p>
      <p className="mt-1 text-red-700">
        Is the API running? Start it with <code className="font-mono">npm run dev:api</code>.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-2 text-red-700 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

/** Small coloured pill, used for categories and task statuses. */
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

type Tone = "slate" | "indigo" | "amber" | "green" | "red";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600",
  indigo: "bg-indigo-100 text-indigo-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

/** Formats a due date as "Today", "Tomorrow", "3 days ago", or a short date. */
export function formatDueDate(iso: string): { text: string; tone: Tone } {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (days < -1) return { text: `${Math.abs(days)} days ago`, tone: "red" };
  if (days === -1) return { text: "Yesterday", tone: "red" };
  if (days === 0) return { text: "Today", tone: "amber" };
  if (days === 1) return { text: "Tomorrow", tone: "indigo" };
  if (days <= 7) return { text: `In ${days} days`, tone: "slate" };

  return {
    text: due.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    tone: "slate",
  };
}
