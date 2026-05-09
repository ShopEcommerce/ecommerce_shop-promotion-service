import 'dotenv/config';
import { app } from './app';
import { rabbitmqWrapper } from '@teleshop/common';
import pino from 'pino';
import { PaymentCompletedListener } from './events/listeners/payment-completed-listener';
import { startReservationExpiryWorker } from './workers/reservation-expiry.worker';

const logger = pino();

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined');
  }
  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL must be defined');
  }

  try {
    await rabbitmqWrapper.connect(process.env.RABBITMQ_URL);

    // Graceful Shutdown
    process.on('SIGINT', () => rabbitmqWrapper.close());
    process.on('SIGTERM', () => rabbitmqWrapper.close());

    new PaymentCompletedListener(rabbitmqWrapper.channel).listen();

    startReservationExpiryWorker();

    const port = process.env.PORT;
    app.listen(port, () => {
      logger.info(`[Promotion Service] is running on port ${port}`);
    });
  } catch (err) {
    logger.error({ msg: 'Failed to start Promotion Service', error: err });
  }
};

start();