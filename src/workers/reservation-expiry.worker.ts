import { prisma } from '../db/prisma';
import { PromotionRepository } from '../modules/promotion/promotion.repository';
import pino from 'pino';

const logger = pino({ name: 'ReservationExpiryWorker' });

let isProcessing = false;

export const startReservationExpiryWorker = () => {
  logger.info('[Promotion Worker] Starting reservation expiry cleanup...');

  setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

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
        try {
          await PromotionRepository.releaseReservation(res.orderId);
          logger.info(
            { orderId: res.orderId, couponId: res.couponId },
            'Successfully released reservation',
          );
        } catch (innerErr) {
          logger.error(
            { err: innerErr, orderId: res.orderId },
            '[Promotion Worker] Failed to release specific reservation, moving to next...',
          );
        }
      }
    } catch (error) {
      logger.error(
        { err: error },
        '[Promotion Worker] Error occurred while cleaning up expired reservations',
      );
    } finally {
      isProcessing = false;
    }
  }, 60000);
};
