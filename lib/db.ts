import { PrismaClient } from "@/lib/generated/prisma";

const gobalForPrisma = globalThis as unknown as {prisma:PrismaClient}

export const db =  gobalForPrisma.prisma || new PrismaClient()

if(process.env.NODE_ENV !== "production") gobalForPrisma.prisma = db;