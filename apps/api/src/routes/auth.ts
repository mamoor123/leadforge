// Auth Routes — Register, Login, JWT
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/register', async (request, reply) => {
    const { email, name, password } = request.body as {
      email: string;
      name: string;
      password: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // TODO: hash password with bcrypt
    const passwordHash = password; // placeholder — use bcrypt in production

    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      token,
    };
  });

  // Login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== password) {
      // TODO: use bcrypt.compare in production
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      token,
    };
  });

  // Get current user
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    });
    return { user };
  });
}
