jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
import { UnauthorizedException } from '@nestjs/common';
import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  const profiles = {
    getCurrent: jest.fn(), registrationContext: jest.fn(), updateCurrent: jest.fn(),
    linkCurrentContact: jest.fn(), activities: jest.fn(), adminSetContact: jest.fn(),
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

  it('covers profile and registration context operations', async () => {
    profiles.getCurrent.mockResolvedValue({ id:'u1' });
    profiles.registrationContext.mockResolvedValue({ profile:{ id:'u1' }, activities:[] });
    profiles.updateCurrent.mockResolvedValue({ id:'u1' });
    profiles.linkCurrentContact.mockResolvedValue({ id:'u1' });
    await expect(controller.get()).resolves.toEqual({ id:'u1' });
    await expect(controller.registrationContext()).resolves.toEqual({ profile:{ id:'u1' }, activities:[] });
    await expect(controller.update({ displayName:'Member' })).resolves.toEqual({ id:'u1' });
    await expect(controller.linkContact({ value:'9876543210' })).resolves.toEqual({ id:'u1' });
  });

  it('covers activities and tenant-scoped admin update', async () => {
    profiles.activities.mockResolvedValue([]);
    profiles.adminSetContact.mockResolvedValue({ id:'u1' });
    await expect(controller.activities()).resolves.toEqual([]);
    await expect(controller.adminSetContact('u1', { value:'9876543210' })).resolves.toEqual({ id:'u1' });
    expect(profiles.adminSetContact).toHaveBeenCalledWith('u1','9876543210','tenant-1');
  });

  it('rejects current profile operations without auth context', () => {
    auth.get.mockReturnValue(null);
    expect(() => controller.get()).toThrow(UnauthorizedException);
    expect(() => controller.registrationContext()).toThrow(UnauthorizedException);
    expect(() => controller.update({})).toThrow(UnauthorizedException);
    expect(() => controller.linkContact({ value:'9876543210' })).toThrow(UnauthorizedException);
    expect(() => controller.activities()).toThrow(UnauthorizedException);
  });

  it('allows admin update without a tenant context', async () => {
    membership.get.mockReturnValue(null);
    profiles.adminSetContact.mockResolvedValue({ id:'u1' });
    await expect(controller.adminSetContact('u1', { value:'9876543210' })).resolves.toEqual({ id:'u1' });
    expect(profiles.adminSetContact).toHaveBeenCalledWith('u1','9876543210',undefined);
  });
});
