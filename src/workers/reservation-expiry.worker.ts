import { prisma } from '../db/prisma';
import { PromotionRepository } from '../modules/promotion/promotion.repository';
import pino from 'pino';

const logger = pino({ name: 'ReservationExpiryWorker' });

export const startReservationExpiryWorker = () => {
  logger.info('[Promotion Worker] Starting reservation expiry cleanup...');

  setInterval(async () => {
    try {
      const now = new Date();

      // Find reservations that are RESERVED and have expired
      const expiredReservations = await prisma.couponReservation.findMany({
        where: {
          status: 'RESERVED',
          expiresAt: { lt: now },
        },
      });

      if (expiredReservations.length === 0) return;

      logger.info(
        `Found ${expiredReservations.length} expired reservations. Proceeding with cleanup...`,
      );

      for (const res of expiredReservations) {
        await PromotionRepository.releaseReservation(res.orderId);
        logger.info(
          { orderId: res.orderId, couponId: res.couponId },
          'Successfully released reservation',
        );
      }
    } catch (error) {
      logger.error(
        { err: error },
        '[Promotion Worker] Error occurred while cleaning up expired reservations',
      );
    }
  }, 60000);
};
