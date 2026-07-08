import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const users: { name: string; email: string; role: Role; password: string }[] = [
  { name: "System Admin", email: "admin@ops.local", role: Role.ADMIN, password: "Admin123!" },
  { name: "Pudding (Lloyd)", email: "jmnventures.digital@gmail.com", role: Role.ADMIN, password: "Admin123!" },
  { name: "Branch Manager", email: "manager@ops.local", role: Role.MANAGER, password: "Manager123!" },
  { name: "Sales Encoder", email: "encoder@ops.local", role: Role.ENCODER, password: "Encoder123!" },
  { name: "Auditor", email: "auditor@ops.local", role: Role.AUDITOR, password: "Auditor123!" },
  { name: "Viewer", email: "viewer@ops.local", role: Role.VIEWER, password: "Viewer123!" },
];

// Default JO production statuses (legacy StatusDatabase "Status Department").
// Maintainable afterwards under Maintenance → Job Orders.
const joStatuses = [
  "For Layout - Graphics",
  "For Approval - Graphics",
  "Ongoing - Printing",
  "Ongoing - Production",
  "On Hold - Production",
  "Waiting - For Pick up / Delivery",
  "Done - Completed",
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, isActive: true },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: bcrypt.hashSync(u.password, 10),
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${users.length} users.`);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@ops.local" },
  });
  for (const [index, label] of joStatuses.entries()) {
    await prisma.lookupOption.upsert({
      where: { type_label: { type: "JO_STATUS", label } },
      update: {},
      create: {
        type: "JO_STATUS",
        label,
        sortOrder: index,
        createdById: admin.id,
      },
    });
  }
  console.log(`Seeded ${joStatuses.length} JO statuses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
