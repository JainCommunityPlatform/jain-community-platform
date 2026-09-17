import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok health status', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
