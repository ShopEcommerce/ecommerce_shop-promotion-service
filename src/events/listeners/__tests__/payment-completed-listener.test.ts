import { Subjects } from '@teleshop/common';
import { PaymentCompletedListener } from '../payment-completed-listener';
import { PromotionRepository } from '../../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../../modules/inbox/inbox.repository';

jest.mock('../../../modules/promotion/promotion.repository');
jest.mock('../../../modules/inbox/inbox.repository');

describe('PaymentCompletedListener', () => {
  const listener = new PaymentCompletedListener({} as any);
  const baseEvent = {
    id: 'evt-payment-1',
    type: Subjects.PaymentCompleted,
    occurredAt: '2026-07-17T10:00:00.000Z',
    version: 1,
    correlationId: 'corr-1',
    orderId: '11111111-1111-1111-1111-111111111111',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips side effects when event was already processed', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(true);

    await listener.onMessage(baseEvent, {} as any);

    expect(PromotionRepository.confirmReservation).not.toHaveBeenCalled();
    expect(InboxRepository.markAsProcessed).not.toHaveBeenCalled();
  });

  it('confirms reservation and records processed event for a new message', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.confirmReservation as jest.Mock).mockResolvedValue({
      orderId: baseEvent.orderId,
      status: 'APPLIED',
    });
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(baseEvent, {} as any);

    expect(PromotionRepository.confirmReservation).toHaveBeenCalledWith(baseEvent.orderId);
    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      baseEvent.id,
      Subjects.PaymentCompleted,
    );
  });

  it('marks event as processed when no reservation exists', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.confirmReservation as jest.Mock).mockResolvedValue(null);
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(baseEvent, {} as any);

    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      baseEvent.id,
      Subjects.PaymentCompleted,
    );
  });

  it('accepts legacy eventId payload for compatibility', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.confirmReservation as jest.Mock).mockResolvedValue({
      orderId: baseEvent.orderId,
      status: 'APPLIED',
    });
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    const legacyEvent = {
      ...baseEvent,
      id: undefined,
      eventId: 'legacy-payment-event-id',
    };

    await listener.onMessage(legacyEvent as any, {} as any);

    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      'legacy-payment-event-id',
      Subjects.PaymentCompleted,
    );
  });

  it('throws when required fields are missing', async () => {
    await expect(
      listener.onMessage(
        {
          id: 'evt-payment-2',
          type: Subjects.PaymentCompleted,
          occurredAt: '2026-07-17T10:00:00.000Z',
          version: 1,
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('Invalid PaymentCompleted payload');
  });
});
