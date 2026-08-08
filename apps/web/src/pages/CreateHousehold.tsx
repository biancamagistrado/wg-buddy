import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";

const COLORS = ["#ec4899", "#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"];

/** First-run screen: name the household and list who lives there. */
export default function CreateHousehold() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setMember(index: number, value: string) {
    setMembers(members.map((m, i) => (i === index ? value : m)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const household = await api.households.create({
        name: name.trim(),
        members: members
          .map((m, i) => ({ name: m.trim(), color: COLORS[i % COLORS.length] }))
          .filter((m) => m.name.length > 0),
      });
      navigate(`/h/${household.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">WG Buddy</p>
        <h1 className="mt-1 text-2xl font-semibold">Set up your household</h1>
        <p className="mt-2 text-sm text-slate-500">
          One shared place for the shopping list and the chores.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="household-name">
            Household name
          </label>
          <input
            id="household-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sonnenallee 12"
            maxLength={80}
            className="input"
            autoFocus
          />
        </div>

        <div>
          <span className="label">Who lives here?</span>
          <div className="space-y-2">
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <input
                  value={member}
                  onChange={(e) => setMember(i, e.target.value)}
                  placeholder={`Person ${i + 1}`}
                  maxLength={80}
                  className="input"
                  aria-label={`Member ${i + 1} name`}
                />
              </div>
            ))}
          </div>
          {members.length < 6 && (
            <button
              type="button"
              onClick={() => setMembers([...members, ""])}
              className="btn-ghost mt-2 text-xs"
            >
              + Add another person
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full">
          {saving ? "Creating…" : "Create household"}
        </button>
      </form>
    </div>
  );
}
