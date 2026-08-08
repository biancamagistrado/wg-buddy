import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError, notFound, parseBody, route } from "../http.js";
import {
  createHouseholdSchema,
  createMemberSchema,
  updateHouseholdSchema,
  updateMemberSchema,
} from "../schemas.js";

export const householdsRouter = Router();

/** GET /api/households - every household, used by the "switch household" picker. */
householdsRouter.get(
  "/",
  route(async (_req, res) => {
    const households = await prisma.household.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        members: { orderBy: { createdAt: "asc" } },
        _count: { select: { items: true, tasks: true } },
      },
    });
    res.json(households);
  }),
);

/** GET /api/households/:id */
householdsRouter.get(
  "/:id",
  route(async (req, res) => {
    const household = await prisma.household.findUnique({
      where: { id: req.params.id },
      include: { members: { orderBy: { createdAt: "asc" } } },
    });
    if (!household) throw notFound("Household");
    res.json(household);
  }),
);

/** POST /api/households - optionally creating its members in the same request. */
householdsRouter.post(
  "/",
  route(async (req, res) => {
    const data = parseBody(createHouseholdSchema, req.body);

    const household = await prisma.household.create({
      data: {
        name: data.name,
        members: data.members?.length
          ? { create: data.members.map((m) => ({ name: m.name, color: m.color })) }
          : undefined,
      },
      include: { members: true },
    });

    res.status(201).json(household);
  }),
);

/** PATCH /api/households/:id - rename the household. */
householdsRouter.patch(
  "/:id",
  route(async (req, res) => {
    const data = parseBody(updateHouseholdSchema, req.body);

    const existing = await prisma.household.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Household");

    const household = await prisma.household.update({
      where: { id: req.params.id },
      data: { name: data.name },
      include: { members: { orderBy: { createdAt: "asc" } } },
    });

    res.json(household);
  }),
);

/** POST /api/households/:id/members */
householdsRouter.post(
  "/:id/members",
  route(async (req, res) => {
    const data = parseBody(createMemberSchema, req.body);

    const household = await prisma.household.findUnique({ where: { id: req.params.id } });
    if (!household) throw notFound("Household");

    const member = await prisma.member.create({
      data: { ...data, householdId: household.id },
    });

    res.status(201).json(member);
  }),
);

/** PATCH /api/households/:id/members/:memberId - rename or recolour a member. */
householdsRouter.patch(
  "/:id/members/:memberId",
  route(async (req, res) => {
    const data = parseBody(updateMemberSchema, req.body);

    const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.householdId !== req.params.id) throw notFound("Member");

    const updated = await prisma.member.update({
      where: { id: req.params.memberId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        // null clears the photo, undefined leaves it untouched.
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    res.json(updated);
  }),
);

/**
 * DELETE /api/households/:id/members/:memberId
 *
 * Their shopping items and tasks are kept and simply become unassigned
 * (onDelete: SetNull), so removing a flatmate never deletes household data.
 */
householdsRouter.delete(
  "/:id/members/:memberId",
  route(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.householdId !== req.params.id) throw notFound("Member");

    await prisma.member.delete({ where: { id: req.params.memberId } });
    res.status(204).send();
  }),
);

/** DELETE /api/households/:id */
householdsRouter.delete(
  "/:id",
  route(async (req, res) => {
    const existing = await prisma.household.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Household");

    // Members, items and tasks go with it (onDelete: Cascade in the schema).
    await prisma.household.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
