import { Message } from 'amqplib';
import {
  BaseListener,
  DomainEvent,
  QueueGroupNames,
  Subjects,
} from '@teleshop/common';
import { PromotionRepository } from '../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../modules/inbox/inbox.repository'; // Import Inbox
import pino from 'pino';

const logger = pino({ name: 'Promotion-PaymentCompletedListener' });

type PaymentCompletedEventData = Extract<
  DomainEvent,
  { subject: Subjects.PaymentCompleted }
>['data'];

export class PaymentCompletedListener extends BaseListener<any> {
  readonly subject: Subjects.PaymentCompleted = Subjects.PaymentCompleted;
  queueGroupName = QueueGroupNames.PromotionService;

  async onMessage(data: PaymentCompletedEventData, _msg: Message) {
    const eventId = data.id || (data as any).eventId;
    const { orderId } = data;
    const correlationId = data.correlationId || 'N/A';

    if (!eventId || !orderId) {
      throw new Error('Invalid PaymentCompleted payload: missing event identifier or orderId');
    }

    logger.info(
      { correlationId, orderId },
      'Received signal: Payment completed. Proceeding to confirm discount code.',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      try {
        await PromotionRepository.confirmReservation(orderId);
        logger.info({ orderId }, 'Successfully confirmed reservation');
      } catch (error: any) {
        if (error.code === 'P2025') {
          logger.info({ orderId }, 'No coupon used for this order. Skipping.');
        } else {
          throw error;
        }
      }

      await InboxRepository.markAsProcessed(eventId, this.subject);
    } catch (error: any) {
      logger.error({ error }, 'Error occurred while confirming reservation');
      throw error;
    }
  }
}
