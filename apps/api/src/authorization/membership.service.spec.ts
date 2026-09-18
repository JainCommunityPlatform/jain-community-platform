import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  it('returns the membership for the authenticated user and tenant', async () => {
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-a',
          tenantId: 'tenant-a',
          role: 'CONTENT_MANAGER',
        }),
      },
    } as never;

    const service = new MembershipService(prisma);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
    });
  });

  it('returns null when no membership exists', async () => {
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as never;

    const service = new MembershipService(prisma);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });

  it('returns null for an unsupported persisted role', async () => {
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-a',
          tenantId: 'tenant-a',
          role: 'SUPER_USER',
        }),
      },
    } as never;

    const service = new MembershipService(prisma);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });
});
