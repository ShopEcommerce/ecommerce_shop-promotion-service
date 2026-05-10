import { PromotionRepository } from './promotion.repository';
import { BadRequestError, NotFoundError } from '@teleshop/common';

export class PromotionService {
  // Coupons

  static async createCoupon(data: any) {
    const existing = await PromotionRepository.getCouponByCode(data.code);
    if (existing) {
      throw new BadRequestError(`Coupon code ${data.code} already exists`);
    }

    const payload = {
      ...data,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
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

  static async updateCoupon(id: string, data: any) {
    const existing = await PromotionRepository.getCouponById(id);
    if (!existing) throw new NotFoundError('Coupon not found');

    if (data.code && data.code !== existing.code) {
      const codeExists = await PromotionRepository.getCouponByCode(data.code);
      if (codeExists) throw new BadRequestError('This coupon code is already in use');
    }

    const payload = { ...data };
    if (data.validFrom) payload.validFrom = new Date(data.validFrom);
    if (data.validUntil) payload.validUntil = new Date(data.validUntil);

    return PromotionRepository.updateCoupon(id, payload);
  }

  static async deleteCoupon(id: string) {
    const existing = await PromotionRepository.getCouponById(id);
    if (!existing) throw new NotFoundError('Coupon not found');
    return PromotionRepository.deleteCoupon(id);
  }

  static async reserveCoupon(userId: string, orderId: string, code: string, orderAmount: number) {
    try {
      return await PromotionRepository.reserveCoupon(userId, orderId, code, orderAmount);
    } catch (error: any) {
      throw new BadRequestError(error.message);
    }
  }

  // Promotions

  static async createPromotion(data: any) {
    const payload = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
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

  static async updatePromotion(id: string, data: any) {
    const existing = await PromotionRepository.getPromotionById(id);
    if (!existing) throw new NotFoundError('Promotion not found');

    const payload = { ...data };
    if (data.startDate) payload.startDate = new Date(data.startDate);
    if (data.endDate) payload.endDate = new Date(data.endDate);

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
