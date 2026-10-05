import { UnauthorizedException } from '@nestjs/common';
import { ProfileMigrationController } from './profile-migration.controller';

describe('ProfileMigrationController', () => {
  const profiles = { provisionByContact: jest.fn(), recordActivity: jest.fn() };
  const controller = new ProfileMigrationController(profiles as never);

  afterEach(() => { delete process.env.JCP_INTERNAL_TOKEN; jest.clearAllMocks(); });

  it('rejects requests without the integration key', async () => {
    expect(() => controller.provision('wrong', { value:'9876543210' })).toThrow(UnauthorizedException);
  });

  it('provisions profiles and records activities with the integration key', async () => {
    process.env.JCP_INTERNAL_TOKEN = 'key';
    profiles.provisionByContact.mockResolvedValue({ id:'u1' });
    await expect(controller.provision('key', { value:'9876543210' })).resolves.toEqual({ id:'u1' });
    profiles.recordActivity.mockResolvedValue(undefined);
    await expect(controller.activity('key', { userId:'u1', eventType:'K', eventId:'1', title:'K', participatedAt:'2026-01-01T00:00:00Z' })).resolves.toEqual({ recorded:true });
  });
});
