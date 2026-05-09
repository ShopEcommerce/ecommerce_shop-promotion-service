import express, { RequestHandler } from 'express';
import { PromotionController } from './promotion.controller';
import { requireAuth, asyncHandler } from '@teleshop/common';
import { validateZod } from '../../middlewares/validate.middleware';
import { createCouponSchema, createPromotionSchema, reserveCouponSchema } from './promotion.schema';

const router = express.Router();
const requireAuthMw = requireAuth as unknown as RequestHandler;

// 1. PUBLIC / INTERNAL ROUTES

router.get(
  '/active',
  asyncHandler(PromotionController.getActivePromotions as any)
);

// PROTECTED ROUTES

router.use(requireAuthMw);

router.post(
  '/coupons/reserve',
  validateZod(reserveCouponSchema),
  asyncHandler(PromotionController.reserveCoupon as any)
);

// --- COUPON ---
router.post('/coupons', validateZod(createCouponSchema), asyncHandler(PromotionController.createCoupon as any));
router.get('/coupons', asyncHandler(PromotionController.getCoupons as any));
router.get('/coupons/:id', asyncHandler(PromotionController.getCouponById as any));
router.put('/coupons/:id', asyncHandler(PromotionController.updateCoupon as any)); // Tạm bỏ qua Schema update cho gọn
router.delete('/coupons/:id', asyncHandler(PromotionController.deleteCoupon as any));

// --- PROMOTION ---
router.post('/', validateZod(createPromotionSchema), asyncHandler(PromotionController.createPromotion as any));
router.get('/', asyncHandler(PromotionController.getPromotions as any));
router.get('/:id', asyncHandler(PromotionController.getPromotionById as any));
router.put('/:id', asyncHandler(PromotionController.updatePromotion as any));
router.delete('/:id', asyncHandler(PromotionController.deletePromotion as any));

export { router as promotionRouter };