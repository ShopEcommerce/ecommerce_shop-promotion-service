import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { PromotionRepository } from '../promotion.repository';

const buildCouponData = (overrides: Partial<Prisma.CouponUncheckedCreateInput> = {}) => ({
  id: crypto.randomUUID(),
  code: `CODE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  discountType: 'PERCENTAGE',
  discountValue: new Prisma.Decimal('10.00'),
  minOrderValue: new Prisma.Decimal('100000'),
  maxUses: 10,
  currentUses: 0,
  validFrom: new Date('2026-07-01T00:00:00.000Z'),
  validUntil: new Date('2026-07-31T23:59:59.000Z'),
  isActive: true,
  ...overrides,
});

const buildPromotionData = (
  overrides: Partial<Prisma.PromotionUncheckedCreateInput> = {},
) => ({
  id: crypto.randomUUID(),
  name: `Promo-${crypto.randomUUID().slice(0, 8)}`,
  description: 'Integration test promotion',
  thumbnailUrl: 'https://example.com/promo.png',
  discountType: 'PERCENTAGE',
  discountValue: new Prisma.Decimal('15.00'),
  appliedProductId: null,
  appliedCategoryId: null,
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-07-31T23:59:59.000Z'),
  isActive: true,
  ...overrides,
});

describe('PromotionRepository integration', () => {
  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany();
    await prisma.processedEvent.deleteMany();
    await prisma.couponReservation.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.promotion.deleteMany();
  });

  describe('coupon CRUD', () => {
    it('creates, reads, updates and deletes a coupon', async () => {
      const couponData = buildCouponData();

      const created = await PromotionRepository.createCoupon(couponData);
      expect(created.code).toBe(couponData.code);

      const foundByCode = await PromotionRepository.getCouponByCode(couponData.code);
      expect(foundByCode?.id).toBe(created.id);

      const updated = await PromotionRepository.updateCoupon(created.id, {
        currentUses: 3,
      });
      expect(updated.currentUses).toBe(3);

      await PromotionRepository.deleteCoupon(created.id);

      const deleted = await PromotionRepository.getCouponById(created.id);
      expect(deleted).toBeNull();
    });

    it('returns paginated coupons matching search', async () => {
      const first = buildCouponData({ code: 'WELCOME-AAA' });
      const second = buildCouponData({ code: 'WELCOME-BBB' });
      const third = buildCouponData({ code: 'SUMMER-CCC' });

      await prisma.coupon.createMany({
        data: [first, second, third],
      });

      const result = await PromotionRepository.getCoupons(1, 10, 'WELCOME');

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((coupon) => coupon.code.includes('WELCOME'))).toBe(true);
    });
  });

  describe('coupon reservation lifecycle', () => {
    it('reserves a coupon and increments currentUses atomically', async () => {
      const coupon = await prisma.coupon.create({
        data: buildCouponData({ code: 'RESERVE10' }),
      });

      const result = await PromotionRepository.reserveCoupon(
        'user-1',
        crypto.randomUUID(),
        'RESERVE10',
        200000,
      );

      expect(result.coupon.id).toBe(coupon.id);
      expect(result.reservation.status).toBe('RESERVED');

      const persistedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(persistedCoupon?.currentUses).toBe(1);
    });

    it('throws when coupon is invalid for the order', async () => {
      await expect(
        PromotionRepository.reserveCoupon('user-1', crypto.randomUUID(), 'INVALID', 200000),
      ).rejects.toThrow('Coupon code does not exist or is invalid');
    });

    it('throws when coupon has reached usage limit', async () => {
      await prisma.coupon.create({
        data: buildCouponData({
          code: 'FULL10',
          maxUses: 1,
          currentUses: 1,
        }),
      });

      await expect(
        PromotionRepository.reserveCoupon('user-1', crypto.randomUUID(), 'FULL10', 200000),
      ).rejects.toThrow('Coupon code has reached its usage limit');
    });

    it('confirms a reservation after payment completion', async () => {
      const coupon = await prisma.coupon.create({
        data: buildCouponData({ code: 'PAY10' }),
      });
      const orderId = crypto.randomUUID();

      await prisma.couponReservation.create({
        data: {
          id: crypto.randomUUID(),
          couponId: coupon.id,
          userId: 'user-1',
          orderId,
          status: 'RESERVED',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const updated = await PromotionRepository.confirmReservation(orderId);

      expect(updated.status).toBe('APPLIED');
    });

    it('releases a reserved coupon and decrements currentUses', async () => {
      const coupon = await prisma.coupon.create({
        data: buildCouponData({ code: 'REL10', currentUses: 1 }),
      });
      const orderId = crypto.randomUUID();

      await prisma.couponReservation.create({
        data: {
          id: crypto.randomUUID(),
          couponId: coupon.id,
          userId: 'user-1',
          orderId,
          status: 'RESERVED',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const released = await PromotionRepository.releaseReservation(orderId);

      expect(released?.status).toBe('RELEASED');

      const persistedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(persistedCoupon?.currentUses).toBe(0);
    });

    it('does nothing when releasing a non-reserved reservation', async () => {
      const coupon = await prisma.coupon.create({
        data: buildCouponData({ code: 'NOOP10', currentUses: 1 }),
      });
      const orderId = crypto.randomUUID();

      await prisma.couponReservation.create({
        data: {
          id: crypto.randomUUID(),
          couponId: coupon.id,
          userId: 'user-1',
          orderId,
          status: 'APPLIED',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const result = await PromotionRepository.releaseReservation(orderId);

      expect(result).toBeUndefined();

      const persistedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(persistedCoupon?.currentUses).toBe(1);
    });
  });

  describe('promotion queries', () => {
    it('creates, updates and deletes a promotion', async () => {
      const promotionData = buildPromotionData();

      const created = await PromotionRepository.createPromotion(promotionData);
      expect(created.name).toBe(promotionData.name);

      const updated = await PromotionRepository.updatePromotion(created.id, {
        name: 'Updated Promotion Name',
      });
      expect(updated.name).toBe('Updated Promotion Name');

      await PromotionRepository.deletePromotion(created.id);
      const deleted = await PromotionRepository.getPromotionById(created.id);
      expect(deleted).toBeNull();
    });

    it('finds active promotions by product, category and global scope', async () => {
      const productId = crypto.randomUUID();
      const categoryId = crypto.randomUUID();

      await prisma.promotion.createMany({
        data: [
          buildPromotionData({ appliedProductId: productId, appliedCategoryId: null }),
          buildPromotionData({ appliedProductId: null, appliedCategoryId: categoryId }),
          buildPromotionData({ appliedProductId: null, appliedCategoryId: null }),
          buildPromotionData({
            appliedProductId: null,
            appliedCategoryId: null,
            isActive: false,
          }),
        ],
      });

      const results = await PromotionRepository.findActivePromotions([productId], [categoryId]);

      expect(results).toHaveLength(3);
      expect(results.every((promotion) => promotion.isActive)).toBe(true);
    });
  });
});
