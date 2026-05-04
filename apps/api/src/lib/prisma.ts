// Shared Prisma client — single instance for the entire API
import { PrismaClient } from '@leadforge/db';

export const prisma = new PrismaClient();
