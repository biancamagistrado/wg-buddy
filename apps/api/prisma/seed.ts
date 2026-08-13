import "dotenv/config";
import { prisma } from "../src/db.js";
import { seedDemoData } from "../src/demoData.js";

// Run with `npm run db:seed`. The data itself lives in src/demoData.ts so the
// server can reuse it when RESET_DEMO_DATA is set on the deployed demo.
seedDemoData()
  .then((name) => {
    console.log(`Seeded household "${name}" with 3 members, 6 items and 6 tasks.`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
