import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDbUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith("file:")) {
    // If it's already an absolute path, use as-is
    const filePath = dbUrl.replace("file:", "");
    if (path.isAbsolute(filePath)) return dbUrl;
    // Otherwise resolve relative to cwd
    return `file:${path.resolve(process.cwd(), filePath)}`;
  }
  // Default fallback
  return `file:${path.resolve(process.cwd(), "dev.db")}`;
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: getDbUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
