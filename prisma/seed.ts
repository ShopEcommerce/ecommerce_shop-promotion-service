import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info('Seeding Promotion Service Database...');

  await prisma.outboxEvent.deleteMany({});
  await prisma.processedEvent.deleteMany({});
  await prisma.couponReservation.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.promotion.deleteMany({});

  const coupon = await prisma.coupon.create({
    data: {
      id: '00000000-0000-0000-0000-000000000601',
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal('10.00'),
      minOrderValue: new Prisma.Decimal('1000000'),
      maxUses: 100,
      currentUses: 1,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
  });

  await prisma.couponReservation.create({
    data: {
      id: '00000000-0000-0000-0000-000000000602',
      couponId: coupon.id,
      userId: '00000000-0000-0000-0000-000000000003',
      orderId: '00000000-0000-0000-0000-000000000401',
      status: 'RESERVED',
      expiresAt: new Date('2026-05-16T10:15:00.000Z'),
    },
  });

  await prisma.promotion.create({
    data: {
      id: '00000000-0000-0000-0000-000000000603',
      name: 'Seed Phone Promotion',
      description: 'Seed promotion for demo storefront flows',
      thumbnailUrl: 'https://picsum.photos/seed/promotion/800/800',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal('15.00'),
      appliedProductId: '00000000-0000-0000-0000-000000000201',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
  });

  logger.info('Promotion seed complete: coupon, reservation, and promotion created.');
}

main()
  .catch((error) => {
    logger.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
