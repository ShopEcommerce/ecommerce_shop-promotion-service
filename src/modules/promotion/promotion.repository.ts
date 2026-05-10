import { prisma } from '../../db/prisma';
import { Prisma, ReservationStatus } from '@prisma/client';

export class PromotionRepository {
  // Coupon

  static async createCoupon(data: Prisma.CouponUncheckedCreateInput) {
    return prisma.coupon.create({ data });
  }

  static async getCoupons(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.CouponWhereInput = search
      ? { code: { contains: search, mode: 'insensitive' } }
      : {};

    const [data, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where: whereCondition }),
    ]);

    return { data, total };
  }

  static async getCouponById(id: string) {
    return prisma.coupon.findUnique({ where: { id } });
  }

  static async getCouponByCode(code: string) {
    return prisma.coupon.findUnique({ where: { code } });
  }

  static async updateCoupon(id: string, data: Prisma.CouponUpdateInput) {
    return prisma.coupon.update({ where: { id }, data });
  }

  static async deleteCoupon(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }

  static async reserveCoupon(userId: string, orderId: string, code: string, orderAmount: number) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const coupon = await tx.coupon.findFirst({
        where: {
          code,
          isActive: true,
          validFrom: { lte: now },
          validUntil: { gte: now },
          minOrderValue: { lte: orderAmount },
        },
      });

      if (!coupon) throw new Error('Coupon code does not exist or is invalid');

      // ATOMIC UPDATE: Increase currentUses if maxUses threshold not reached
      const updateResult = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          currentUses: { lt: coupon.maxUses }, // current < max
        },
        data: {
          currentUses: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Coupon code has reached its usage limit');
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const reservation = await tx.couponReservation.create({
        data: {
          couponId: coupon.id,
          userId,
          orderId,
          status: ReservationStatus.RESERVED,
          expiresAt,
        },
      });

      return { reservation, coupon };
    });
  }

  static async confirmReservation(orderId: string) {
    return prisma.couponReservation.update({
      where: { orderId },
      data: { status: ReservationStatus.APPLIED },
    });
  }

  static async releaseReservation(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.couponReservation.findUnique({
        where: { orderId },
        include: { coupon: true },
      });

      if (!reservation || reservation.status !== ReservationStatus.RESERVED) return;

      await tx.coupon.update({
        where: { id: reservation.couponId },
        data: { currentUses: { decrement: 1 } },
      });

      return tx.couponReservation.update({
        where: { orderId },
        data: { status: ReservationStatus.RELEASED },
      });
    });
  }

  // Promotion

  static async createPromotion(data: Prisma.PromotionUncheckedCreateInput) {
    return prisma.promotion.create({ data });
  }

  static async getPromotions(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.PromotionWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [data, total] = await prisma.$transaction([
      prisma.promotion.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.promotion.count({ where: whereCondition }),
    ]);

    return { data, total };
  }

  static async getPromotionById(id: string) {
    return prisma.promotion.findUnique({ where: { id } });
  }

  static async updatePromotion(id: string, data: Prisma.PromotionUpdateInput) {
    return prisma.promotion.update({ where: { id }, data });
  }

  static async deletePromotion(id: string) {
    return prisma.promotion.delete({ where: { id } });
  }

  static async findActivePromotions(productIds: string[], categoryIds: string[]) {
    const now = new Date();
    return prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { appliedProductId: { in: productIds } },
          { appliedCategoryId: { in: categoryIds } },
          { AND: [{ appliedProductId: null }, { appliedCategoryId: null }] },
        ],
      },
    });
  }
}
