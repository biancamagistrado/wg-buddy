import { useState } from "react";
import { api, ApiError } from "../api";
import { useHousehold } from "../components/Layout";
import { Avatar } from "../components/ui";
import { toAvatarDataUrl } from "../image";
import type { Member } from "../types";

const COLORS = ["#ec4899", "#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"];

/** Rename the household, and add, rename, recolour or remove the people in it. */
export default function Settings() {
  const { household, refreshHousehold, currentMemberId, setCurrentMemberId } = useHousehold();

  return (
    <div className="space-y-5">
      <HouseholdName
        id={household.id}
        initialName={household.name}
        onSaved={refreshHousehold}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Who lives here
        </h2>
        <ul className="card divide-y divide-slate-100">
          {household.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isYou={member.id === currentMemberId}
              onSaved={refreshHousehold}
              onRemoved={() => {
                if (member.id === currentMemberId) setCurrentMemberId(null);
                refreshHousehold();
              }}
            />
          ))}
          {household.members.length === 0 && (
            <li className="px-3 py-4 text-sm text-slate-500">Nobody added yet.</li>
          )}
        </ul>
      </section>

      <AddMember
        id={household.id}
        nextColor={COLORS[household.members.length % COLORS.length]}
        onAdded={refreshHousehold}
      />
    </div>
  );
}

function HouseholdName({
  id,
  initialName,
  onSaved,
}: {
  id: string;
  initialName: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const changed = name.trim() !== initialName && name.trim().length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!changed) return;

    setSaving(true);
    setError(null);
    try {
      await api.households.rename(id, name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-4">
      <label className="label" htmlFor="household-name">
        Household name
      </label>
      <div className="flex gap-2">
        <input
          id="household-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="input"
        />
        <button type="submit" disabled={!changed || saving} className="btn-primary shrink-0">
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function MemberRow({
  member,
  isYou,
  onSaved,
  onRemoved,
}: {
  member: Member;
  isYou: boolean;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [color, setColor] = useState(member.color);
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Shrink the chosen photo in the browser, then show it as a preview. */
  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setAvatarUrl(await toAvatarDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image");
    }
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.households.updateMember(member.householdId, member.id, {
        name: name.trim(),
        color,
        avatarUrl,
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError(null);
    try {
      await api.households.removeMember(member.householdId, member.id);
      onRemoved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove");
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <li className="space-y-3 px-3 py-3">
        <div className="flex items-center gap-3">
          {/* Live preview of the photo, or the colour circle if there isn't one. */}
          <Avatar member={{ ...member, name, color, avatarUrl }} size="lg" />

          <div className="flex flex-col gap-1.5">
            <label className="btn-ghost cursor-pointer ring-1 ring-slate-200">
              {avatarUrl ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="btn-ghost text-xs text-slate-500"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="input"
          aria-label="Member name"
          autoFocus
        />

        {/* The colour is only visible when there is no photo. */}
        {!avatarUrl && (
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full transition ${
                  color === c ? "ring-2 ring-slate-900 ring-offset-2" : ""
                }`}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button onClick={save} disabled={!name.trim() || saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setName(member.name);
              setColor(member.color);
              setAvatarUrl(member.avatarUrl);
              setError(null);
              setEditing(false);
            }}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Avatar member={member} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {member.name}
        {isYou && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
      </span>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Remove?</span>
          <button onClick={remove} className="btn bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
            Yes
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost px-2 py-1 text-xs">
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="btn-ghost px-2 py-1 text-xs">
            Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="rounded px-2 py-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${member.name}`}
          >
            ✕
          </button>
        </div>
      )}

      {error && !confirming && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

function AddMember({
  id,
  nextColor,
  onAdded,
}: {
  id: string;
  nextColor: string;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await api.households.addMember(id, { name: name.trim(), color: nextColor });
      setName("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4">
      <label className="label" htmlFor="new-member">
        Add someone
      </label>
      <div className="flex gap-2">
        <span
          className="mt-1 h-7 w-7 shrink-0 rounded-full"
          style={{ backgroundColor: nextColor }}
          aria-hidden
        />
        <input
          id="new-member"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name"
          maxLength={80}
          className="input"
        />
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary shrink-0">
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Removing someone keeps their items and tasks, they just become unassigned.
      </p>
    </form>
  );
}
