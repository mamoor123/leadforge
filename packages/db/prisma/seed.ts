// packages/db/prisma/seed.ts
// Run with: pnpm db:seed

import { PrismaClient, Plan, Channel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@leadforge.io' },
    update: {},
    create: {
      email: 'demo@leadforge.io',
      name: 'Demo User',
      plan: Plan.PRO,
    },
  });

  console.log(`✅ Created user: ${user.email} (${user.id})`);

  // Create a demo sequence
  const sequence = await prisma.sequence.create({
    data: {
      userId: user.id,
      name: 'Website Audit Outreach',
      channel: Channel.EMAIL,
      steps: {
        create: [
          {
            order: 1,
            subject: 'Quick heads-up about {businessName}',
            bodyTemplate:
              'Hi {contactName},\n\nI ran a quick audit on {businessName} and found some issues that might be costing you customers...',
            delayDays: 0,
          },
          {
            order: 2,
            subject: 'Follow-up: {businessName}',
            bodyTemplate:
              'Hi {contactName},\n\nJust checking if you had a chance to look at my previous email...',
            delayDays: 3,
          },
          {
            order: 3,
            subject: 'Last note about {businessName}',
            bodyTemplate:
              "Hi {contactName},\n\nI'll keep this short — wanted to share one more insight before I close your file...",
            delayDays: 7,
          },
        ],
      },
    },
  });

  console.log(`✅ Created sequence: ${sequence.name} (${sequence.id})`);

  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
