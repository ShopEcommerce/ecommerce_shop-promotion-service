import { Subjects } from '@teleshop/common';
import { OrderCancelledListener } from '../order-cancelled-listener';
import { PromotionRepository } from '../../../modules/promotion/promotion.repository';
import { InboxRepository } from '../../../modules/inbox/inbox.repository';

jest.mock('../../../modules/promotion/promotion.repository');
jest.mock('../../../modules/inbox/inbox.repository');

describe('OrderCancelledListener', () => {
  const listener = new OrderCancelledListener({} as any);
  const baseEvent = {
    id: 'evt-cancel-1',
    type: Subjects.OrderCancelled,
    occurredAt: '2026-07-17T10:00:00.000Z',
    version: 1,
    correlationId: 'corr-2',
    orderId: '22222222-2222-2222-2222-222222222222',
    userId: 'user-1',
    reason: 'User requested cancellation',
    items: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips side effects when event was already processed', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(true);

    await listener.onMessage(baseEvent, {} as any);

    expect(PromotionRepository.releaseReservation).not.toHaveBeenCalled();
    expect(InboxRepository.markAsProcessed).not.toHaveBeenCalled();
  });

  it('releases reservation and records processed event for a new message', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.releaseReservation as jest.Mock).mockResolvedValue({
      orderId: baseEvent.orderId,
      status: 'RELEASED',
    });
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(baseEvent, {} as any);

    expect(PromotionRepository.releaseReservation).toHaveBeenCalledWith(baseEvent.orderId);
    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      baseEvent.id,
      Subjects.OrderCancelled,
    );
  });

  it('marks event as processed when no reservation exists', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.releaseReservation as jest.Mock).mockResolvedValue(undefined);
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(baseEvent, {} as any);

    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      baseEvent.id,
      Subjects.OrderCancelled,
    );
  });

  it('accepts legacy eventId payload for compatibility', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (PromotionRepository.releaseReservation as jest.Mock).mockResolvedValue({
      orderId: baseEvent.orderId,
      status: 'RELEASED',
    });
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    const legacyEvent = {
      ...baseEvent,
      id: undefined,
      eventId: 'legacy-cancel-event-id',
    };

    await listener.onMessage(legacyEvent as any, {} as any);

    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      'legacy-cancel-event-id',
      Subjects.OrderCancelled,
    );
  });

  it('throws when required fields are missing', async () => {
    await expect(
      listener.onMessage(
        {
          id: 'evt-cancel-2',
          type: Subjects.OrderCancelled,
          occurredAt: '2026-07-17T10:00:00.000Z',
          version: 1,
          userId: 'user-1',
          reason: 'Bad payload',
          items: [],
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('Invalid OrderCancelled payload');
  });
});
