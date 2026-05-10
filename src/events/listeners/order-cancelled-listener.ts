import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames, Subjects } from '@teleshop/common';
import { PromotionRepository } from '../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Promotion-OrderCancelledListener' });

export class OrderCancelledListener extends BaseListener<any> {
  readonly subject = Subjects.OrderCancelled;
  queueGroupName = QueueGroupNames.PromotionService;

  async onMessage(data: any, _msg: Message) {
    const { eventId, orderId } = data;
    const correlationId = data.correlationId || 'N/A';

    logger.info(
      { correlationId, orderId },
      'User cancelled order. Proceeding to BURN the coupon...',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      try {
        await PromotionRepository.confirmReservation(orderId);
        logger.info({ orderId }, 'Coupon burned successfully. User lost this promotion.');
      } catch (error: any) {
        if (error.code === 'P2025') {
          logger.info({ orderId }, 'No coupon used for this order. Skipping.');
        } else {
          throw error;
        }
      }

      await InboxRepository.markAsProcessed(eventId, this.subject);
    } catch (error: any) {
      logger.error('Error processing OrderCancelled event', error);
      throw error;
    }
  }
}
