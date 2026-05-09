import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames } from '@teleshop/common';
import { PromotionRepository } from '../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../modules/inbox/inbox.repository'; // Import Inbox
import pino from 'pino';

const logger = pino({ name: 'Promotion-PaymentCompletedListener' });

export class PaymentCompletedListener extends BaseListener<any> {
  subject: any = 'PaymentCompleted';
  queueGroupName = QueueGroupNames.PromotionService;

  async onMessage(data: any, msg: Message) {
    const { eventId, orderId } = data;
    const correlationId = data.correlationId || 'N/A';

    logger.info({ correlationId, orderId }, 'Received signal: Payment completed. Proceeding to confirm discount code.');
    
    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      await PromotionRepository.confirmReservation(orderId).catch(() => {});
      
      await InboxRepository.markAsProcessed(eventId, this.subject);
      logger.info({ orderId }, 'Successfully confirmed reservation');
    } catch (error: any) {
      logger.error('Error occurred while confirming reservation', error);
      throw error;
    }
  }
}