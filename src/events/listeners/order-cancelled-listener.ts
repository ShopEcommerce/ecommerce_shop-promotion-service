import { Message } from 'amqplib';
import {
  BaseListener,
  DomainEvent,
  QueueGroupNames,
  Subjects,
} from '@teleshop/common';
import { PromotionRepository } from '../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Promotion-OrderCancelledListener' });

type OrderCancelledEventData = Extract<
  DomainEvent,
  { subject: Subjects.OrderCancelled }
>['data'];

export class OrderCancelledListener extends BaseListener<any> {
  readonly subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName = QueueGroupNames.PromotionService;

  async onMessage(data: OrderCancelledEventData, _msg: Message) {
    const eventId = data.id || (data as any).eventId;
    const { orderId } = data;
    const correlationId = data.correlationId || 'N/A';

    if (!eventId || !orderId) {
      throw new Error('Invalid OrderCancelled payload: missing event identifier or orderId');
    }

    logger.info(
      { correlationId, orderId },
      'Order cancelled. Proceeding to release reserved coupon usage if present.',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      try {
        await PromotionRepository.releaseReservation(orderId);
        logger.info({ orderId }, 'Coupon reservation released successfully.');
      } catch (error: any) {
        if (error.code === 'P2025') {
          logger.info({ orderId }, 'No coupon used for this order. Skipping.');
        } else {
          throw error;
        }
      }

      await InboxRepository.markAsProcessed(eventId, this.subject);
    } catch (error: any) {
      logger.error({ error }, 'Error processing OrderCancelled event');
      throw error;
    }
  }
}
