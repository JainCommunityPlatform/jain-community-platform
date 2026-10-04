import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  it('returns the membership for the authenticated user and tenant', async () => {
    const getMembership = jest.fn().mockResolvedValue({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
    });
    const firestore = { getMembership };

    const service = new MembershipService(firestore as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
    });

    expect(getMembership).toHaveBeenCalledWith('user-a', 'tenant-a');
  });

  it('returns null when no membership exists', async () => {
    const getMembership = jest.fn().mockResolvedValue(null);
    const service = new MembershipService({ getMembership } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });

  it('returns null for an unsupported persisted role', async () => {
    const getMembership = jest.fn().mockResolvedValue({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'SUPER_USER',
    });
    const service = new MembershipService({ getMembership } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });
});
