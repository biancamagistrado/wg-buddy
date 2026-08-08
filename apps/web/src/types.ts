/** Shapes returned by the API. These mirror the Prisma models on the backend. */

export type Category =
  | "PRODUCE"
  | "DAIRY"
  | "BAKERY"
  | "MEAT"
  | "FROZEN"
  | "DRINKS"
  | "HOUSEHOLD"
  | "OTHER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface Member {
  id: string;
  name: string;
  color: string;
  /** Small JPEG data URL, or null when the member has no photo. */
  avatarUrl: string | null;
  householdId: string;
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
  _count?: { items: number; tasks: number };
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  category: Category;
  done: boolean;
  householdId: string;
  addedById: string | null;
  addedBy: Member | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  dueDate: string | null;
  householdId: string;
  assigneeId: string | null;
  assignee: Member | null;
  createdAt: string;
  updatedAt: string;
}

export interface Overview {
  shopping: { open: number; done: number };
  tasks: {
    openTotal: number;
    overdue: Task[];
    thisWeek: Task[];
    noDueDate: Task[];
  };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  PRODUCE: "Produce",
  DAIRY: "Dairy",
  BAKERY: "Bakery",
  MEAT: "Meat & Fish",
  FROZEN: "Frozen",
  DRINKS: "Drinks",
  HOUSEHOLD: "Household",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};
