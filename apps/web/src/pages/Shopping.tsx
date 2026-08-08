import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAsync } from "../hooks";
import { useHousehold } from "../components/Layout";
import { Avatar, Badge, EmptyState, ErrorBox, Spinner } from "../components/ui";
import { CATEGORY_LABELS, type Category, type ShoppingItem } from "../types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function Shopping() {
  const { household, currentMemberId } = useHousehold();
  const { data: items, loading, error, reload, setData } = useAsync(
    () => api.items.list(household.id),
    [household.id],
  );

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<Category>("OTHER");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { open, done } = useMemo(() => {
    const list = items ?? [];
    return {
      open: list.filter((i) => !i.done),
      done: list.filter((i) => i.done),
    };
  }, [items]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFormError(null);
    try {
      const created = await api.items.create(household.id, {
        name: name.trim(),
        quantity: quantity.trim() || undefined,
        category,
        addedById: currentMemberId,
      });
      setData([created, ...(items ?? [])]);
      setName("");
      setQuantity("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not add the item");
    } finally {
      setSaving(false);
    }
  }

  /** Optimistic toggle: flip it locally first so the checkbox feels instant. */
  async function toggle(item: ShoppingItem) {
    const next = !item.done;
    setData((items ?? []).map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    try {
      await api.items.update(item.id, { done: next });
    } catch {
      reload(); // Put the real state back if the server disagreed.
    }
  }

  async function remove(item: ShoppingItem) {
    setData((items ?? []).filter((i) => i.id !== item.id));
    try {
      await api.items.remove(item.id);
    } catch {
      reload();
    }
  }

  async function clearDone() {
    setData((items ?? []).filter((i) => !i.done));
    try {
      await api.items.clearCompleted(household.id);
    } catch {
      reload();
    }
  }

  if (loading) return <Spinner label="Loading the shopping list…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <form onSubmit={addItem} className="card p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add an item…"
            maxLength={80}
            className="input sm:flex-1"
            aria-label="Item name"
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            maxLength={30}
            className="input sm:w-24"
            aria-label="Quantity"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="input sm:w-36"
            aria-label="Category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary sm:w-auto">
            Add
          </button>
        </div>
        {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
      </form>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          To buy
          <Badge tone="indigo">{open.length}</Badge>
        </h2>

        {open.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Nothing on the list"
            hint="Add what the household needs and everyone will see it."
          />
        ) : (
          <ul className="card divide-y divide-slate-100">
            {open.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} onDelete={remove} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              In the basket
              <Badge tone="green">{done.length}</Badge>
            </h2>
            <button onClick={clearDone} className="btn-ghost text-xs">
              Clear
            </button>
          </div>
          <ul className="card divide-y divide-slate-100 opacity-70">
            {done.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} onDelete={remove} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5">
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item)}
        className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        aria-label={`Mark ${item.name} as ${item.done ? "not bought" : "bought"}`}
      />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${item.done ? "text-slate-400 line-through" : ""}`}>
          {item.name}
          {item.quantity && <span className="ml-1.5 font-normal text-slate-500">{item.quantity}</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge>{CATEGORY_LABELS[item.category]}</Badge>
          {item.addedBy && <Avatar member={item.addedBy} size="xs" />}
        </div>
      </div>

      <button
        onClick={() => onDelete(item)}
        className="rounded px-2 py-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        aria-label={`Delete ${item.name}`}
      >
        ✕
      </button>
    </li>
  );
}
