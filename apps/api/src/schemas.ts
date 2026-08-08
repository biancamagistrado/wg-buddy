import { z } from "zod";

/**
 * Validation rules for everything the API accepts.
 *
 * These live in one file so the rules are easy to find, and so the frontend can
 * mirror the same limits in its forms.
 */

export const CATEGORIES = [
  "PRODUCE",
  "DAIRY",
  "BAKERY",
  "MEAT",
  "FROZEN",
  "DRINKS",
  "HOUSEHOLD",
  "OTHER",
] as const;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

const name = z.string().trim().min(1, "Name is required").max(80, "Name is too long");

export const createHouseholdSchema = z.object({
  name,
  /// Optional list of people to create along with the household.
  members: z
    .array(z.object({ name, color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }))
    .max(20)
    .optional(),
});

export const updateHouseholdSchema = z.object({ name });

/**
 * A profile photo, sent as a JPEG/PNG/WebP data URL.
 *
 * The browser shrinks images to 256x256 before sending, which lands around
 * 10-20 kB. The 400 kB ceiling here is a backstop against anything larger
 * being posted directly to the API.
 */
const avatarUrl = z
  .string()
  .max(400_000, "Image is too large")
  .regex(/^data:image\/(jpeg|png|webp);base64,/, "Must be a JPEG, PNG or WebP image")
  .nullable();

export const createMemberSchema = z.object({
  name,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour").optional(),
  avatarUrl: avatarUrl.optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const createItemSchema = z.object({
  name,
  quantity: z.string().trim().max(30).optional().or(z.literal("")),
  category: z.enum(CATEGORIES).optional(),
  addedById: z.string().optional().nullable(),
});

/** Every field optional - PATCH updates only what you send. */
export const updateItemSchema = createItemSchema.partial().extend({
  done: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  title: name,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(TASK_STATUSES).optional(),
  // Accepts "2026-08-14" or a full ISO timestamp from the date input.
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();
