jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
import { UnauthorizedException } from '@nestjs/common';
import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  const profiles = {
    getCurrent: jest.fn(), updateCurrent: jest.fn(), linkCurrentContact: jest.fn(),
    activities: jest.fn(), adminSetContact: jest.fn(), recordActivity: jest.fn(),
  };
  const auth = { get: jest.fn() };
  const membership = { get: jest.fn() };
  let controller: ProfileController;
  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProfileController(profiles as never, auth as never, membership as never);
    auth.get.mockReturnValue({ subject:'s1' });
    membership.get.mockReturnValue({ tenantId:'tenant-1' });
  });

  it('gets, updates and links the current profile', async () => {
    profiles.getCurrent.mockResolvedValue({ id:'u1' });
    profiles.updateCurrent.mockResolvedValue({ id:'u1' });
    profiles.linkCurrentContact.mockResolvedValue({ id:'u1' });
    await expect(controller.get()).resolves.toEqual({ id:'u1' });
    await expect(controller.update({ displayName:'Member' })).resolves.toEqual({ id:'u1' });
    await expect(controller.linkContact({ value:'9876543210' })).resolves.toEqual({ id:'u1' });
  });

  it('gets participation and scopes admin contact updates to the tenant', async () => {
    profiles.activities.mockResolvedValue([]);
    profiles.adminSetContact.mockResolvedValue({ id:'u1' });
    await expect(controller.activities()).resolves.toEqual([]);
    await expect(controller.adminSetContact('u1', { value:'9876543210' })).resolves.toEqual({ id:'u1' });
    expect(profiles.adminSetContact).toHaveBeenCalledWith('u1','9876543210','tenant-1');
  });

  it('rejects current profile operations without auth context', () => {
    auth.get.mockReturnValue(null);
    expect(() => controller.get()).toThrow(UnauthorizedException);
    expect(() => controller.update({})).toThrow(UnauthorizedException);
    expect(() => controller.linkContact({ value:'9876543210' })).toThrow(UnauthorizedException);
    expect(() => controller.activities()).toThrow(UnauthorizedException);
  });

  it('allows admin update without a tenant context when the service permits it', async () => {
    membership.get.mockReturnValue(null);
    profiles.adminSetContact.mockResolvedValue({ id:'u1' });
    await expect(controller.adminSetContact('u1', { value:'9876543210' })).resolves.toEqual({ id:'u1' });
    expect(profiles.adminSetContact).toHaveBeenCalledWith('u1','9876543210',undefined);
  });

  it('protects trusted activity ingestion', async () => {
    const previous = process.env.JCP_INTERNAL_TOKEN;
    process.env.JCP_INTERNAL_TOKEN = 'test-key';
    await expect(controller.recordActivity('wrong', { userId:'u1', eventType:'K', eventId:'1', title:'K', participatedAt:'2026-01-01T00:00:00Z' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.recordActivity('test-key', { userId:'u1', eventType:'K', eventId:'1', title:'K', participatedAt:'2026-01-01T00:00:00Z' })).resolves.toEqual({ recorded:true });
    process.env.JCP_INTERNAL_TOKEN = previous;
  });
});
