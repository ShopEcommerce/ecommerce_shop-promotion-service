import express, { RequestHandler } from 'express';
import { PromotionController } from './promotion.controller';
import { requireAuth, requireRole, asyncHandler } from '@teleshop/common';
import { validateZod } from '../../middlewares/validate.middleware';
import {
  createCouponSchema,
  createPromotionSchema,
  reserveCouponSchema,
  updateCouponSchema,
  updatePromotionSchema,
} from './promotion.schema';

const router = express.Router();
const requireAuthMw = requireAuth as unknown as RequestHandler;
const requireAdminMw = requireRole(['ADMIN']) as unknown as RequestHandler;

router.get('/active', asyncHandler(PromotionController.getActivePromotions as any));

router.use(requireAuthMw);

router.post(
  '/coupons/reserve',
  validateZod(reserveCouponSchema),
  asyncHandler(PromotionController.reserveCoupon as any),
);

router.post(
  '/coupons',
  requireAdminMw,
  validateZod(createCouponSchema),
  asyncHandler(PromotionController.createCoupon as any),
);
router.get('/coupons', requireAdminMw, asyncHandler(PromotionController.getCoupons as any));
router.get('/coupons/:id', requireAdminMw, asyncHandler(PromotionController.getCouponById as any));
router.put(
  '/coupons/:id',
  requireAdminMw,
  validateZod(updateCouponSchema),
  asyncHandler(PromotionController.updateCoupon as any),
);
router.delete('/coupons/:id', requireAdminMw, asyncHandler(PromotionController.deleteCoupon as any));

router.post(
  '/',
  requireAdminMw,
  validateZod(createPromotionSchema),
  asyncHandler(PromotionController.createPromotion as any),
);
router.get('/', requireAdminMw, asyncHandler(PromotionController.getPromotions as any));
router.get('/:id', requireAdminMw, asyncHandler(PromotionController.getPromotionById as any));
router.put(
  '/:id',
  requireAdminMw,
  validateZod(updatePromotionSchema),
  asyncHandler(PromotionController.updatePromotion as any),
);
router.delete('/:id', requireAdminMw, asyncHandler(PromotionController.deletePromotion as any));

export { router as promotionRouter };
