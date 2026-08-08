import type { Household, Member, Overview, ShoppingItem, Task } from "./types";

/**
 * Every call to the backend goes through here.
 *
 * Keeping it in one file means the rest of the app never writes a URL by hand,
 * and error handling is done once instead of in every component.
 */

/** Thrown for any non-2xx response, carrying the API's own error message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    // The API always replies with JSON, but a crash could return HTML.
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed", body.details);
  }

  // 204 No Content (used by DELETE) has an empty body.
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

const send = (method: string) => (path: string, body?: unknown) =>
  request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  households: {
    list: () => request<Household[]>("/households"),
    get: (id: string) => request<Household>(`/households/${id}`),
    create: (data: { name: string; members?: { name: string; color?: string }[] }) =>
      send("POST")("/households", data) as Promise<Household>,
    overview: (id: string) => request<Overview>(`/households/${id}/overview`),
    rename: (id: string, name: string) =>
      send("PATCH")(`/households/${id}`, { name }) as Promise<Household>,

    addMember: (id: string, data: { name: string; color?: string }) =>
      send("POST")(`/households/${id}/members`, data) as Promise<Member>,
    updateMember: (
      id: string,
      memberId: string,
      data: { name?: string; color?: string; avatarUrl?: string | null },
    ) =>
      send("PATCH")(`/households/${id}/members/${memberId}`, data) as Promise<Member>,
    removeMember: (id: string, memberId: string) =>
      send("DELETE")(`/households/${id}/members/${memberId}`) as Promise<void>,
  },

  items: {
    list: (householdId: string) => request<ShoppingItem[]>(`/households/${householdId}/items`),
    create: (
      householdId: string,
      data: { name: string; quantity?: string; category?: string; addedById?: string | null },
    ) => send("POST")(`/households/${householdId}/items`, data) as Promise<ShoppingItem>,
    update: (id: string, data: Partial<Pick<ShoppingItem, "name" | "quantity" | "category" | "done">>) =>
      send("PATCH")(`/items/${id}`, data) as Promise<ShoppingItem>,
    remove: (id: string) => send("DELETE")(`/items/${id}`) as Promise<void>,
    clearCompleted: (householdId: string) =>
      send("DELETE")(`/households/${householdId}/items/completed`) as Promise<{ deleted: number }>,
  },

  tasks: {
    list: (householdId: string) => request<Task[]>(`/households/${householdId}/tasks`),
    create: (
      householdId: string,
      data: {
        title: string;
        notes?: string;
        dueDate?: string | null;
        assigneeId?: string | null;
        status?: string;
      },
    ) => send("POST")(`/households/${householdId}/tasks`, data) as Promise<Task>,
    update: (
      id: string,
      data: Partial<{
        title: string;
        notes: string;
        status: string;
        dueDate: string | null;
        assigneeId: string | null;
      }>,
    ) => send("PATCH")(`/tasks/${id}`, data) as Promise<Task>,
    remove: (id: string) => send("DELETE")(`/tasks/${id}`) as Promise<void>,
  },
};
