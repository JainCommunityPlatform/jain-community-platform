import { TenantMemberService } from './tenant-member.service';

describe('TenantMemberService', () => {
  const firestore = {
    listMemberships: jest.fn(),
    getMembership: jest.fn(),
    createMembership: jest.fn(),
    updateMembership: jest.fn(),
    deleteMembership: jest.fn(),
    getUser: jest.fn(),
  };
  const tenantContext = { get: jest.fn() };
  const audit = { record: jest.fn() };
  const membershipService = {
    assignRoles: jest.fn().mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
      createdAt: new Date('2026-01-01'),
    }),
  };

  let service: TenantMemberService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Tenant',
      hostname: 'test.example',
    });
    service = new TenantMemberService(
      firestore as never,
      tenantContext as never,
      audit as never,
      membershipService as never,
    );
  });

  it('lists only members from the resolved tenant', async () => {
    firestore.listMemberships.mockResolvedValue([
      {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'TENANT_ADMIN',
        createdAt: new Date('2026-01-01'),
        user: { email: 'one@example.com', displayName: 'One' },
      },
    ]);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({ userId: 'user-1', role: 'TENANT_ADMIN' }),
    ]);
    expect(firestore.listMemberships).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
    );
  });

  it('rejects adding an unknown user', async () => {
    firestore.getUser.mockResolvedValue(null);

    await expect(
      service.create('00000000-0000-0000-0000-000000000099', 'CONTENT_MANAGER'),
    ).rejects.toThrow('User not found');
    expect(firestore.createMembership).not.toHaveBeenCalled();
  });

  it('rejects duplicate membership', async () => {
    firestore.getUser.mockResolvedValue({ id: 'user-1' });
    firestore.getMembership.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('user-1', 'CONTENT_MANAGER'),
    ).rejects.toThrow('already a member');
    expect(firestore.createMembership).not.toHaveBeenCalled();
  });

  it('audits membership creation', async () => {
    firestore.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'one@example.com',
      displayName: 'One',
    });
    firestore.getMembership.mockResolvedValue(null);
    firestore.createMembership.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: '00000000-0000-0000-0000-000000000001',
      role: 'CONTENT_MANAGER',
      createdAt: new Date('2026-01-01'),
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
    firestore.getMembership
      .mockResolvedValueOnce({
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'CONTENT_MANAGER',
        createdAt: new Date('2026-01-01'),
      })
      .mockResolvedValueOnce({
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'EVENT_MANAGER',
        createdAt: new Date('2026-01-01'),
      });
    firestore.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'one@example.com',
      displayName: 'One',
    });
    firestore.updateMembership.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'EVENT_MANAGER',
      createdAt: new Date('2026-01-01'),
    });

    await service.update('user-1', 'EVENT_MANAGER');

    expect(membershipService.assignRoles).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
      ['EVENT_MANAGER'],
    );
    expect(firestore.updateMembership).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_ROLE_CHANGED' }),
    );
  });

  it('prevents removing the final tenant administrator', async () => {
    firestore.getMembership.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'TENANT_ADMIN',
      roles: ['TENANT_ADMIN'],
      createdAt: new Date('2026-01-01'),
    });
    firestore.listMemberships.mockResolvedValue([
      { userId: 'user-1', role: 'TENANT_ADMIN', roles: ['TENANT_ADMIN'] },
    ]);

    await expect(service.remove('user-1')).rejects.toThrow(
      'At least one temple administrator must remain assigned',
    );
    expect(firestore.deleteMembership).not.toHaveBeenCalled();
  });

  it('removes and audits a membership inside the resolved tenant', async () => {
    firestore.getMembership.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'CONTENT_MANAGER',
      createdAt: new Date('2026-01-01'),
    });

    await service.remove('user-1');

    expect(firestore.deleteMembership).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_REMOVED' }),
    );
  });
});
