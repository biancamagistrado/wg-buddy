import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError, notFound, parseBody, route } from "../http.js";
import { TASK_STATUSES, createTaskSchema, updateTaskSchema } from "../schemas.js";

export const tasksRouter = Router();

/** GET /api/households/:householdId/tasks?status=TODO&assigneeId=... */
tasksRouter.get(
  "/households/:householdId/tasks",
  route(async (req, res) => {
    const { householdId } = req.params;

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household");

    const { status, assigneeId } = req.query;

    if (status && !TASK_STATUSES.includes(status as never)) {
      throw new HttpError(400, `status must be one of: ${TASK_STATUSES.join(", ")}`);
    }

    const tasks = await prisma.task.findMany({
      where: {
        householdId,
        ...(status ? { status: status as (typeof TASK_STATUSES)[number] } : {}),
        ...(typeof assigneeId === "string" ? { assigneeId } : {}),
      },
      include: { assignee: true },
      // Tasks with a deadline first, soonest at the top.
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });

    res.json(tasks);
  }),
);

/** POST /api/households/:householdId/tasks */
tasksRouter.post(
  "/households/:householdId/tasks",
  route(async (req, res) => {
    const { householdId } = req.params;
    const data = parseBody(createTaskSchema, req.body);

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw notFound("Household");

    // Guard against assigning a task to someone in a different household.
    if (data.assigneeId) {
      const member = await prisma.member.findUnique({ where: { id: data.assigneeId } });
      if (!member || member.householdId !== householdId) {
        throw new HttpError(400, "Assignee is not a member of this household");
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        notes: data.notes || null,
        status: data.status ?? "TODO",
        dueDate: data.dueDate ?? null,
        assigneeId: data.assigneeId || null,
        householdId,
      },
      include: { assignee: true },
    });

    res.status(201).json(task);
  }),
);

/** PATCH /api/tasks/:id */
tasksRouter.patch(
  "/tasks/:id",
  route(async (req, res) => {
    const data = parseBody(updateTaskSchema, req.body);

    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Task");

    if (data.assigneeId) {
      const member = await prisma.member.findUnique({ where: { id: data.assigneeId } });
      if (!member || member.householdId !== existing.householdId) {
        throw new HttpError(400, "Assignee is not a member of this household");
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
      },
      include: { assignee: true },
    });

    res.json(task);
  }),
);

/** DELETE /api/tasks/:id */
tasksRouter.delete(
  "/tasks/:id",
  route(async (req, res) => {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Task");

    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
