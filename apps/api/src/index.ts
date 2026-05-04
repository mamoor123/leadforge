import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { leadRoutes } from './routes/leads';
import { searchRoutes } from './routes/search';
import { sequenceRoutes } from './routes/sequences';
import { signalRoutes } from './routes/signals';
import { crmRoutes } from './routes/crm';
import { authRoutes } from './routes/auth';
import { reportRoutes } from './routes/reports';
import { billingRoutes } from './routes/billing';
import { prisma } from './lib/prisma';

const server = Fastify({ logger: true });

// Plugins
await server.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
await server.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' });

// Auth decorator
server.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Routes
await server.register(authRoutes, { prefix: '/api/auth' });
await server.register(searchRoutes, { prefix: '/api/search' });
await server.register(leadRoutes, { prefix: '/api/leads' });
await server.register(sequenceRoutes, { prefix: '/api/sequences' });
await server.register(signalRoutes, { prefix: '/api/signals' });
await server.register(crmRoutes, { prefix: '/api/crm' });
await server.register(reportRoutes, { prefix: '/api/reports' });
await server.register(billingRoutes, { prefix: '/api/billing' });

// Health check
server.get('/health', async () => ({ status: 'ok', version: '0.1.0' }));

// Graceful shutdown — disconnect Prisma on exit
const shutdown = async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const port = parseInt(process.env.PORT || '4000');
await server.listen({ port, host: '0.0.0.0' });
console.log(`🔥 LeadForge API running on port ${port}`);
