import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { __barbernexDb?: PrismaClient };
export const db = globalDb.__barbernexDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.__barbernexDb = db;
