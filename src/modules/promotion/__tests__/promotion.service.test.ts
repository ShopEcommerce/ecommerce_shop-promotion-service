import { PromotionService } from '../promotion.service';
import { PromotionRepository } from '../promotion.repository';

jest.mock('../promotion.repository');

describe('PromotionService', () => {
  const couponId = '11111111-1111-1111-1111-111111111111';
  const promotionId = '22222222-2222-2222-2222-222222222222';

  const couponInput = {
    code: 'WELCOME10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderValue: 100000,
    maxUses: 50,
    validFrom: '2026-07-01T00:00:00.000Z',
    validUntil: '2026-07-31T23:59:59.000Z',
    isActive: true,
  };

  const promotionInput = {
    name: 'Summer Phone Sale',
    description: 'Discount for phone category',
    thumbnailUrl: 'https://example.com/promo.png',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    appliedProductId: null,
    appliedCategoryId: '33333333-3333-3333-3333-333333333333',
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2026-07-31T23:59:59.000Z',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('creates a coupon when code is available and converts dates', async () => {
      (PromotionRepository.getCouponByCode as jest.Mock).mockResolvedValue(null);
      (PromotionRepository.createCoupon as jest.Mock).mockImplementation(async (payload) => ({
        id: couponId,
        ...payload,
      }));

      const result = await PromotionService.createCoupon(couponInput);

      expect(PromotionRepository.getCouponByCode).toHaveBeenCalledWith(couponInput.code);
      expect(PromotionRepository.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          code: couponInput.code,
          validFrom: expect.any(Date),
          validUntil: expect.any(Date),
        }),
      );
      expect(result.id).toBe(couponId);
    });

    it('throws when coupon code already exists', async () => {
      (PromotionRepository.getCouponByCode as jest.Mock).mockResolvedValue({ id: couponId });

      await expect(PromotionService.createCoupon(couponInput)).rejects.toThrow(
        `Coupon code ${couponInput.code} already exists`,
      );
      expect(PromotionRepository.createCoupon).not.toHaveBeenCalled();
    });
  });

  describe('getCouponById', () => {
    it('returns coupon when found', async () => {
      const coupon = { id: couponId, code: couponInput.code };
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue(coupon);

      await expect(PromotionService.getCouponById(couponId)).resolves.toEqual(coupon);
    });

    it('throws when coupon does not exist', async () => {
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue(null);

      await expect(PromotionService.getCouponById(couponId)).rejects.toThrow('Coupon not found');
    });
  });

  describe('updateCoupon', () => {
    it('updates coupon and converts provided dates', async () => {
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue({
        id: couponId,
        code: couponInput.code,
      });
      (PromotionRepository.updateCoupon as jest.Mock).mockResolvedValue({
        id: couponId,
        code: couponInput.code,
      });

      await PromotionService.updateCoupon(couponId, {
        validFrom: couponInput.validFrom,
        validUntil: couponInput.validUntil,
      });

      expect(PromotionRepository.updateCoupon).toHaveBeenCalledWith(
        couponId,
        expect.objectContaining({
          validFrom: expect.any(Date),
          validUntil: expect.any(Date),
        }),
      );
    });

    it('throws when coupon to update does not exist', async () => {
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue(null);

      await expect(PromotionService.updateCoupon(couponId, {})).rejects.toThrow(
        'Coupon not found',
      );
      expect(PromotionRepository.updateCoupon).not.toHaveBeenCalled();
    });

    it('throws when new coupon code is already in use', async () => {
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue({
        id: couponId,
        code: 'WELCOME10',
      });
      (PromotionRepository.getCouponByCode as jest.Mock).mockResolvedValue({
        id: 'duplicate-coupon',
        code: 'WELCOME20',
      });

      await expect(
        PromotionService.updateCoupon(couponId, { code: 'WELCOME20' }),
      ).rejects.toThrow('This coupon code is already in use');
      expect(PromotionRepository.updateCoupon).not.toHaveBeenCalled();
    });
  });

  describe('deleteCoupon', () => {
    it('deletes existing coupon', async () => {
      (PromotionRepository.getCouponById as jest.Mock).mockResolvedValue({ id: couponId });
      (PromotionRepository.deleteCoupon as jest.Mock).mockResolvedValue({ id: couponId });

      await PromotionService.deleteCoupon(couponId);

      expect(PromotionRepository.deleteCoupon).toHaveBeenCalledWith(couponId);
    });
  });

  describe('reserveCoupon', () => {
    it('returns reservation when repository succeeds', async () => {
      const reservationResult = {
        reservation: { orderId: 'order-1', userId: 'user-1' },
        coupon: { id: couponId, code: couponInput.code },
      };
      (PromotionRepository.reserveCoupon as jest.Mock).mockResolvedValue(reservationResult);

      await expect(
        PromotionService.reserveCoupon('user-1', 'order-1', couponInput.code, 250000),
      ).resolves.toEqual(reservationResult);
    });

    it('wraps repository errors as BadRequestError', async () => {
      (PromotionRepository.reserveCoupon as jest.Mock).mockRejectedValue(
        new Error('Coupon code has reached its usage limit'),
      );

      await expect(
        PromotionService.reserveCoupon('user-1', 'order-1', couponInput.code, 250000),
      ).rejects.toThrow('Coupon code has reached its usage limit');
    });
  });

  describe('createPromotion', () => {
    it('creates promotion and converts dates', async () => {
      (PromotionRepository.createPromotion as jest.Mock).mockImplementation(async (payload) => ({
        id: promotionId,
        ...payload,
      }));

      const result = await PromotionService.createPromotion(promotionInput);

      expect(PromotionRepository.createPromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          name: promotionInput.name,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(result.id).toBe(promotionId);
    });
  });

  describe('getPromotionById', () => {
    it('returns promotion when found', async () => {
      const promotion = { id: promotionId, name: promotionInput.name };
      (PromotionRepository.getPromotionById as jest.Mock).mockResolvedValue(promotion);

      await expect(PromotionService.getPromotionById(promotionId)).resolves.toEqual(promotion);
    });

    it('throws when promotion is missing', async () => {
      (PromotionRepository.getPromotionById as jest.Mock).mockResolvedValue(null);

      await expect(PromotionService.getPromotionById(promotionId)).rejects.toThrow(
        'Promotion not found',
      );
    });
  });

  describe('updatePromotion', () => {
    it('updates promotion and converts provided dates', async () => {
      (PromotionRepository.getPromotionById as jest.Mock).mockResolvedValue({
        id: promotionId,
      });
      (PromotionRepository.updatePromotion as jest.Mock).mockResolvedValue({
        id: promotionId,
      });

      await PromotionService.updatePromotion(promotionId, {
        startDate: promotionInput.startDate,
        endDate: promotionInput.endDate,
      });

      expect(PromotionRepository.updatePromotion).toHaveBeenCalledWith(
        promotionId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it('throws when promotion to update does not exist', async () => {
      (PromotionRepository.getPromotionById as jest.Mock).mockResolvedValue(null);

      await expect(PromotionService.updatePromotion(promotionId, {})).rejects.toThrow(
        'Promotion not found',
      );
    });
  });

  describe('deletePromotion', () => {
    it('deletes existing promotion', async () => {
      (PromotionRepository.getPromotionById as jest.Mock).mockResolvedValue({ id: promotionId });
      (PromotionRepository.deletePromotion as jest.Mock).mockResolvedValue({ id: promotionId });

      await PromotionService.deletePromotion(promotionId);

      expect(PromotionRepository.deletePromotion).toHaveBeenCalledWith(promotionId);
    });
  });

  describe('getActivePromotions', () => {
    it('delegates product and category filters to repository', async () => {
      const promotions = [{ id: promotionId }];
      (PromotionRepository.findActivePromotions as jest.Mock).mockResolvedValue(promotions);

      await expect(
        PromotionService.getActivePromotions(['product-1'], ['category-1']),
      ).resolves.toEqual(promotions);

      expect(PromotionRepository.findActivePromotions).toHaveBeenCalledWith(
        ['product-1'],
        ['category-1'],
      );
    });
  });
});
