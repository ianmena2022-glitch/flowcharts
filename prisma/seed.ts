import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@flowcharts.local";
  const password = "admin123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: "Admin",
      },
    });
    console.log(`Usuario creado: ${email} / ${password} — cambiar la contraseña después del primer login.`);
  } else {
    console.log("El usuario inicial ya existía, no se recrea.");
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
