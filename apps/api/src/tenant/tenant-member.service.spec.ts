import { TenantMemberService } from './tenant-member.service';

describe('TenantMemberService', () => {
  const prisma = {
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const tenantContext = { get: jest.fn() };
  const audit = { record: jest.fn() };

  let service: TenantMemberService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Tenant',
      hostname: 'test.example',
    });
    service = new TenantMemberService(
      prisma as never,
      tenantContext as never,
      audit as never,
    );
  });

  it('lists only members from the resolved tenant', async () => {
    prisma.membership.findMany.mockResolvedValue([
      {
        id: 'membership-1',
        userId: 'user-1',
        role: 'TENANT_ADMIN',
        createdAt: new Date('2026-01-01'),
        user: { email: 'one@example.com', displayName: 'One' },
      },
    ]);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({ userId: 'user-1', role: 'TENANT_ADMIN' }),
    ]);
    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: '00000000-0000-0000-0000-000000000001' },
      }),
    );
  });

  it('rejects adding an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create('00000000-0000-0000-0000-000000000099', 'CONTENT_MANAGER'),
    ).rejects.toThrow('User not found');
    expect(prisma.membership.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate membership', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.membership.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('user-1', 'CONTENT_MANAGER'),
    ).rejects.toThrow('already a member');
    expect(prisma.membership.create).not.toHaveBeenCalled();
  });

  it('audits membership creation', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.membership.findUnique.mockResolvedValue(null);
    prisma.membership.create.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      role: 'CONTENT_MANAGER',
      createdAt: new Date('2026-01-01'),
      user: { email: 'one@example.com', displayName: 'One' },
    });

    await service.create('user-1', 'CONTENT_MANAGER');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MEMBERSHIP_CREATED',
        entity: 'Membership',
        entityId: 'membership-1',
      }),
    );
  });

  it('updates and audits a membership inside the resolved tenant', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'CONTENT_MANAGER',
      user: { email: 'one@example.com', displayName: 'One' },
    });
    prisma.membership.update.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      role: 'EVENT_MANAGER',
      createdAt: new Date('2026-01-01'),
      user: { email: 'one@example.com', displayName: 'One' },
    });

    await service.update('user-1', 'EVENT_MANAGER');

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { role: 'EVENT_MANAGER' },
      include: { user: true },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_ROLE_CHANGED' }),
    );
  });

  it('removes and audits a membership inside the resolved tenant', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'CONTENT_MANAGER',
      user: { email: 'one@example.com', displayName: 'One' },
    });

    await service.remove('user-1');

    expect(prisma.membership.delete).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_REMOVED' }),
    );
  });
});
