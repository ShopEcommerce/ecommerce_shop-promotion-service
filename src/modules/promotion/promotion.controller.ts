import { Request, Response } from 'express';
import { PromotionService } from './promotion.service';
import pino from 'pino';

const logger = pino({ name: 'PromotionController' });

export class PromotionController {

  // COUPON

  static async createCoupon(req: Request, res: Response) {
    const coupon = await PromotionService.createCoupon(req.body);
    logger.info({ couponId: coupon.id }, 'Created new coupon');
    res.status(201).send({ message: 'Coupon created successfully', data: coupon });
  }

  static async getCoupons(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await PromotionService.getAllCoupons(page, limit, search);
    res.status(200).send({ data: result.data, meta: { page, limit, total: result.total } });
  }

  static async getCouponById(req: Request<{ id: string }>, res: Response) {
    const coupon = await PromotionService.getCouponById(req.params.id);
    res.status(200).send({ data: coupon });
  }

  static async updateCoupon(req: Request<{ id: string }>, res: Response) {
    const coupon = await PromotionService.updateCoupon(req.params.id, req.body);
    res.status(200).send({ message: 'Update successful', data: coupon });
  }

  static async deleteCoupon(req: Request<{ id: string }>, res: Response) {
    await PromotionService.deleteCoupon(req.params.id);
    res.status(200).send({ message: 'Coupon deleted successfully' });
  }


  // PROMOTION

  static async createPromotion(req: Request, res: Response) {
    const promotion = await PromotionService.createPromotion(req.body);
    res.status(201).send({ message: 'Promotion created successfully', data: promotion });
  }

  static async getPromotions(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await PromotionService.getAllPromotions(page, limit, search);
    res.status(200).send({ data: result.data, meta: { page, limit, total: result.total } });
  }

  static async getPromotionById(req: Request<{ id: string }>, res: Response) {
    const promotion = await PromotionService.getPromotionById(req.params.id);
    res.status(200).send({ data: promotion });
  }

  static async updatePromotion(req: Request<{ id: string }>, res: Response) {
    const promotion = await PromotionService.updatePromotion(req.params.id, req.body);
    res.status(200).send({ message: 'Update successful', data: promotion });
  }

  static async deletePromotion(req: Request<{ id: string }>, res: Response) {
    await PromotionService.deletePromotion(req.params.id);
    res.status(200).send({ message: 'Promotion deleted successfully' });
  }

  // INTERNAL API

  static async reserveCoupon(req: Request, res: Response) {
    const userId = req.currentUser!.id;
    const { code, orderId, orderAmount } = req.body;

    logger.info({ userId, orderId, code }, 'Request to reserve coupon');

    const result = await PromotionService.reserveCoupon(userId, orderId, code, orderAmount);
    res.status(200).send({ message: 'Coupon reserved successfully', data: result });
  }

  static async getActivePromotions(req: Request, res: Response) {
    const productIds = req.query.productIds ? (req.query.productIds as string).split(',') : [];
    const categoryIds = req.query.categoryIds ? (req.query.categoryIds as string).split(',') : [];

    const promotions = await PromotionService.getActivePromotions(productIds, categoryIds);
    res.status(200).send({ data: promotions });
  }
}