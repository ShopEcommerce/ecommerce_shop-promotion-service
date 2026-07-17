import { PromotionRepository } from './promotion.repository';
import { BadRequestError, NotFoundError } from '@teleshop/common';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  createCouponSchema,
  createPromotionSchema,
  updateCouponSchema,
  updatePromotionSchema,
} from './promotion.schema';

type CreateCouponInput = z.infer<typeof createCouponSchema>['body'];
type UpdateCouponInput = z.infer<typeof updateCouponSchema>['body'];
type CreatePromotionInput = z.infer<typeof createPromotionSchema>['body'];
type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>['body'];

const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export class PromotionService {
  private static parseDate(dateValue: string) {
    return new Date(dateValue);
  }

  // Coupons

  static async createCoupon(data: CreateCouponInput) {
    const normalizedCode = normalizeCouponCode(data.code);
    const existing = await PromotionRepository.getCouponByCode(normalizedCode);
    if (existing) {
      throw new BadRequestError(`Coupon code ${normalizedCode} already exists`);
    }

    const payload: Prisma.CouponUncheckedCreateInput = {
      ...data,
      code: normalizedCode,
      validFrom: this.parseDate(data.validFrom),
      validUntil: this.parseDate(data.validUntil),
    };
    return PromotionRepository.createCoupon(payload);
  }

  static async getAllCoupons(page: number, limit: number, search?: string) {
    return PromotionRepository.getCoupons(page, limit, search);
  }

  static async getCouponById(id: string) {
    const coupon = await PromotionRepository.getCouponById(id);
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }

  static async updateCoupon(id: string, data: UpdateCouponInput) {
    const existing = await PromotionRepository.getCouponById(id);
    if (!existing) throw new NotFoundError('Coupon not found');

    const normalizedCode = data.code ? normalizeCouponCode(data.code) : undefined;

    if (normalizedCode && normalizedCode !== existing.code) {
      const codeExists = await PromotionRepository.getCouponByCode(normalizedCode);
      if (codeExists) throw new BadRequestError('This coupon code is already in use');
    }

    const payload: Prisma.CouponUpdateInput = { ...data };
    if (normalizedCode) payload.code = normalizedCode;
    if (data.validFrom) payload.validFrom = this.parseDate(data.validFrom);
    if (data.validUntil) payload.validUntil = this.parseDate(data.validUntil);

    return PromotionRepository.updateCoupon(id, payload);
  }

  static async deleteCoupon(id: string) {
    const existing = await PromotionRepository.getCouponById(id);
    if (!existing) throw new NotFoundError('Coupon not found');
    return PromotionRepository.deleteCoupon(id);
  }

  static async reserveCoupon(userId: string, orderId: string, code: string, orderAmount: number) {
    try {
      return await PromotionRepository.reserveCoupon(
        userId,
        orderId,
        normalizeCouponCode(code),
        orderAmount,
      );
    } catch (error: any) {
      throw new BadRequestError(error.message);
    }
  }

  // Promotions

  static async createPromotion(data: CreatePromotionInput) {
    const payload: Prisma.PromotionUncheckedCreateInput = {
      ...data,
      startDate: this.parseDate(data.startDate),
      endDate: this.parseDate(data.endDate),
    };
    return PromotionRepository.createPromotion(payload);
  }

  static async getAllPromotions(page: number, limit: number, search?: string) {
    return PromotionRepository.getPromotions(page, limit, search);
  }

  static async getPromotionById(id: string) {
    const promotion = await PromotionRepository.getPromotionById(id);
    if (!promotion) throw new NotFoundError('Promotion not found');
    return promotion;
  }

  static async updatePromotion(id: string, data: UpdatePromotionInput) {
    const existing = await PromotionRepository.getPromotionById(id);
    if (!existing) throw new NotFoundError('Promotion not found');

    const payload: Prisma.PromotionUpdateInput = { ...data };
    if (data.startDate) payload.startDate = this.parseDate(data.startDate);
    if (data.endDate) payload.endDate = this.parseDate(data.endDate);

    return PromotionRepository.updatePromotion(id, payload);
  }

  static async deletePromotion(id: string) {
    const existing = await PromotionRepository.getPromotionById(id);
    if (!existing) throw new NotFoundError('Promotion not found');
    return PromotionRepository.deletePromotion(id);
  }

  static async getActivePromotions(productIds: string[], categoryIds: string[]) {
    return PromotionRepository.findActivePromotions(productIds, categoryIds);
  }
}
