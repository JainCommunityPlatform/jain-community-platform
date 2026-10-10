import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationEventDispatcher } from './notification-event-dispatcher.service';

/**
 * Lightweight polling worker for failed notifications. Delivery remains
 * best-effort and outside financial request handling. Firestore delivery
 * records provide deduplication when more than one API replica is running.
 */
@Injectable()
export class NotificationRetryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRetryWorker.name);
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly dispatcher: NotificationEventDispatcher) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.NOTIFICATION_RETRY_ENABLED === 'false') return;
    const configured = Number(process.env.NOTIFICATION_RETRY_INTERVAL_MS ?? 60_000);
    const intervalMs = Number.isFinite(configured) ? Math.max(15_000, Math.min(900_000, configured)) : 60_000;
    void this.runOnce();
    this.interval = setInterval(() => void this.runOnce(), intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.dispatcher.retryFailedDeliveries();
      if (result.retried > 0) {
        this.logger.log('Retried ' + result.retried + ' failed notification deliveries');
      }
    } catch {
      this.logger.warn('Notification retry worker iteration failed');
    } finally {
      this.running = false;
    }
  }
}
