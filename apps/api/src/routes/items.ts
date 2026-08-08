import { Router } from "express";
import { prisma } from "../db.js";
import { notFound, parseBody, route } from "../http.js";
import { createItemSchema, updateItemSchema } from "../schemas.js";

/**
 * Shopping list endpoints.
 *
 * Creating and listing happen under a household ("/households/:id/items")
 * because an item only exists inside one. Updating and deleting use the item's
 * own id, since that is already unique.
 */
export const itemsRouter = Router();

/** GET /api/households/:householdId/items?done=false */
itemsRouter.get(
  "/households/:householdId/items",
  route(async (req, res) => {
    const { householdId } = req.params;

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household");

    // ?done=true / ?done=false filters; leaving it off returns everything.
    const done =
      req.query.done === "true" ? true : req.query.done === "false" ? false : undefined;

    const items = await prisma.shoppingItem.findMany({
      where: { householdId, ...(done === undefined ? {} : { done }) },
      include: { addedBy: true },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    });

    res.json(items);
  }),
);

/** POST /api/households/:householdId/items */
itemsRouter.post(
  "/households/:householdId/items",
  route(async (req, res) => {
    const { householdId } = req.params;
    const data = parseBody(createItemSchema, req.body);

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household");

    const item = await prisma.shoppingItem.create({
      data: {
        name: data.name,
        quantity: data.quantity || null,
        category: data.category ?? "OTHER",
        addedById: data.addedById || null,
        householdId,
      },
      include: { addedBy: true },
    });

    res.status(201).json(item);
  }),
);

/** PATCH /api/items/:id - also used by the checkbox to toggle `done`. */
itemsRouter.patch(
  "/items/:id",
  route(async (req, res) => {
    const data = parseBody(updateItemSchema, req.body);

    const existing = await prisma.shoppingItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Item");

    const item = await prisma.shoppingItem.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.quantity !== undefined && { quantity: data.quantity || null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.done !== undefined && { done: data.done }),
        ...(data.addedById !== undefined && { addedById: data.addedById || null }),
      },
      include: { addedBy: true },
    });

    res.json(item);
  }),
);

/** DELETE /api/items/:id */
itemsRouter.delete(
  "/items/:id",
  route(async (req, res) => {
    const existing = await prisma.shoppingItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Item");

    await prisma.shoppingItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

/** DELETE /api/households/:householdId/items/completed - the "clear done" button. */
itemsRouter.delete(
  "/households/:householdId/items/completed",
  route(async (req, res) => {
    const { count } = await prisma.shoppingItem.deleteMany({
      where: { householdId: req.params.householdId, done: true },
    });
    res.json({ deleted: count });
  }),
);
