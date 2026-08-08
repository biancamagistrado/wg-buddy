import { Router } from "express";
import { prisma } from "../db.js";
import { notFound, route } from "../http.js";

export const overviewRouter = Router();

/**
 * GET /api/households/:id/overview
 *
 * The weekly summary shown on the home screen: what still needs buying, and
 * which tasks are overdue, due this week, or have no deadline at all.
 *
 * This is the only endpoint that reads from both the shopping list and the
 * tasks, which is why it lives in its own file rather than with either one.
 */
overviewRouter.get(
  "/households/:id/overview",
  route(async (req, res) => {
    const householdId = req.params.id;

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household");

    // Midnight today, so a task due earlier today still counts as "today".
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Three independent queries, run at the same time rather than one after
    // the other - the page is not ready until all three come back.
    const [openItems, doneItems, tasks] = await Promise.all([
      prisma.shoppingItem.count({ where: { householdId, done: false } }),
      prisma.shoppingItem.count({ where: { householdId, done: true } }),
      prisma.task.findMany({
        where: { householdId, status: { not: "DONE" } },
        include: { assignee: true },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < startOfToday);
    const thisWeek = tasks.filter(
      (t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate < endOfWeek,
    );
    const noDueDate = tasks.filter((t) => !t.dueDate);

    res.json({
      shopping: { open: openItems, done: doneItems },
      tasks: {
        openTotal: tasks.length,
        overdue,
        thisWeek,
        noDueDate,
      },
    });
  }),
);
