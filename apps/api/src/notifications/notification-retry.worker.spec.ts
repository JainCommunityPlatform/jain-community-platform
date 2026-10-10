import { NotificationRetryWorker } from './notification-retry.worker';

describe('NotificationRetryWorker', () => {
  const dispatcher = { retryFailedDeliveries: jest.fn() };
  const worker = () => new NotificationRetryWorker(dispatcher as never);

  beforeEach(() => {
    jest.clearAllMocks();
    dispatcher.retryFailedDeliveries.mockResolvedValue({ examined: 0, retried: 0 });
    process.env.NODE_ENV = 'test';
  });

  it('runs a retry iteration and logs only when deliveries were retried', async () => {
    dispatcher.retryFailedDeliveries.mockResolvedValue({ examined: 4, retried: 2 });
    const instance = worker();
    await instance.runOnce();
    expect(dispatcher.retryFailedDeliveries).toHaveBeenCalledTimes(1);
  });

  it('prevents overlapping worker iterations', async () => {
    let resolveRun!: (value: { examined: number; retried: number }) => void;
    dispatcher.retryFailedDeliveries.mockReturnValueOnce(new Promise((resolve) => { resolveRun = resolve; }));
    const instance = worker();
    const first = instance.runOnce();
    await instance.runOnce();
    expect(dispatcher.retryFailedDeliveries).toHaveBeenCalledTimes(1);
    resolveRun({ examined: 0, retried: 0 });
    await first;
    await instance.runOnce();
    expect(dispatcher.retryFailedDeliveries).toHaveBeenCalledTimes(2);
  });

  it('swallows worker iteration errors and releases the running lock', async () => {
    dispatcher.retryFailedDeliveries.mockRejectedValueOnce(new Error('unexpected'));
    const instance = worker();
    await expect(instance.runOnce()).resolves.toBeUndefined();
    await instance.runOnce();
    expect(dispatcher.retryFailedDeliveries).toHaveBeenCalledTimes(2);
  });

  it('does not start an interval in test mode and safely destroys without one', () => {
    const instance = worker();
    expect(instance.onModuleInit()).toBeUndefined();
    expect(instance.onModuleDestroy()).toBeUndefined();
  });
});
