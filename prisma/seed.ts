import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import path from "path";

function getDbUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith("file:")) {
    const filePath = dbUrl.replace("file:", "");
    if (path.isAbsolute(filePath)) return dbUrl;
    return `file:${path.resolve(process.cwd(), filePath)}`;
  }
  return `file:${path.resolve(process.cwd(), "dev.db")}`;
}

const adapter = new PrismaLibSql({ url: getDbUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@golfpickem.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@golfpickem.com",
      passwordHash: adminHash,
      isAdmin: true,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create demo players
  const playerHash = await hash("player123", 12);
  const players = [];
  const playerNames = ["Mike", "Sarah", "Tom", "Lisa", "Dave", "Amy", "John"];
  for (const name of playerNames) {
    const player = await prisma.user.upsert({
      where: { email: `${name.toLowerCase()}@golfpickem.com` },
      update: {},
      create: {
        name,
        email: `${name.toLowerCase()}@golfpickem.com`,
        passwordHash: playerHash,
      },
    });
    players.push(player);
    console.log(`Created player: ${player.name}`);
  }

  // Create sample golfers
  const golferNames = [
    "Scottie Scheffler", "Rory McIlroy", "Jon Rahm", "Collin Morikawa",
    "Viktor Hovland", "Patrick Cantlay", "Xander Schauffele", "Ludvig Aberg",
    "Wyndham Clark", "Bryson DeChambeau", "Brooks Koepka", "Justin Thomas",
    "Jordan Spieth", "Max Homa", "Tommy Fleetwood", "Sahith Theegala",
    "Hideki Matsuyama", "Shane Lowry", "Tony Finau", "Cameron Young",
  ];

  const golfers = [];
  for (const name of golferNames) {
    const golfer = await prisma.golfer.upsert({
      where: { id: name.toLowerCase().replace(/\s/g, "-") },
      update: {},
      create: {
        id: name.toLowerCase().replace(/\s/g, "-"),
        name,
      },
    });
    golfers.push(golfer);
  }
  console.log(`Created ${golfers.length} golfers`);

  // Create a sample tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: "The Masters 2026",
      startDate: new Date("2026-04-09"),
      endDate: new Date("2026-04-12"),
      buyIn: 5000,
      status: "UPCOMING",
    },
  });
  console.log(`Created tournament: ${tournament.name}`);

  // Add golfers to tournament
  for (const golfer of golfers) {
    await prisma.tournamentGolfer.create({
      data: {
        tournamentId: tournament.id,
        golferId: golfer.id,
      },
    });
  }
  console.log(`Added ${golfers.length} golfers to tournament field`);

  console.log("\nSeed complete!");
  console.log("\nDemo accounts:");
  console.log("  Admin: admin@golfpickem.com / admin123");
  console.log("  Players: mike@golfpickem.com / player123 (and sarah, tom, lisa, dave, amy, john)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
