import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Days from today, at 18:00, so the weekly overview has something to show. */
function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(18, 0, 0, 0);
  return d;
}

async function main() {
  // Start from a clean slate so re-seeding never produces duplicates.
  await prisma.task.deleteMany();
  await prisma.shoppingItem.deleteMany();
  await prisma.member.deleteMany();
  await prisma.household.deleteMany();

  const household = await prisma.household.create({
    data: {
      name: "Sonnenallee 12",
      members: {
        create: [
          { name: "Bianca", color: "#ec4899" },
          { name: "Muthanna", color: "#6366f1" },
          { name: "Nasser", color: "#10b981" },
        ],
      },
    },
    include: { members: true },
  });

  const [bianca, muthanna, nasser] = household.members;

  await prisma.shoppingItem.createMany({
    data: [
      { name: "Milk", quantity: "2L", category: "DAIRY", householdId: household.id, addedById: bianca.id },
      { name: "Bread", quantity: "1", category: "BAKERY", householdId: household.id, addedById: muthanna.id },
      { name: "Tomatoes", quantity: "500g", category: "PRODUCE", householdId: household.id, addedById: bianca.id },
      { name: "Coffee beans", quantity: "1kg", category: "DRINKS", householdId: household.id, addedById: nasser.id },
      { name: "Dish soap", category: "HOUSEHOLD", householdId: household.id, addedById: muthanna.id },
      { name: "Frozen pizza", quantity: "3", category: "FROZEN", householdId: household.id, addedById: nasser.id, done: true },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Take out the recycling",
        notes: "Yellow bin goes out Tuesday night",
        status: "TODO",
        dueDate: inDays(-1), // overdue, so the overview has a red section
        householdId: household.id,
        assigneeId: nasser.id,
      },
      {
        title: "Clean the bathroom",
        status: "IN_PROGRESS",
        dueDate: inDays(0),
        householdId: household.id,
        assigneeId: bianca.id,
      },
      {
        title: "Vacuum the living room",
        status: "TODO",
        dueDate: inDays(2),
        householdId: household.id,
        assigneeId: muthanna.id,
      },
      {
        title: "Water the plants",
        status: "TODO",
        dueDate: inDays(4),
        householdId: household.id,
      },
      {
        title: "Fix the wobbly kitchen chair",
        notes: "Needs an Allen key",
        status: "TODO",
        householdId: household.id,
      },
      {
        title: "Buy a new shower curtain",
        status: "DONE",
        dueDate: inDays(-3),
        householdId: household.id,
        assigneeId: bianca.id,
      },
    ],
  });

  console.log(`Seeded household "${household.name}" with 3 members, 6 items and 6 tasks.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
