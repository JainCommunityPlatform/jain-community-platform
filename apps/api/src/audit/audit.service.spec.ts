import { AuditService } from './audit.service';
import { MembershipContextStore } from '../authorization/membership-context.store';

describe('AuditService', () => {
  it('records the current tenant and user from authorization context', async () => {
    const recordAudit = jest.fn().mockResolvedValue(undefined);
    const firestore = { recordAudit };
    const membershipContext = {
      get: jest.fn().mockReturnValue({
        userId: 'user-a',
        tenantId: 'tenant-a',
        membership: {
          userId: 'user-a',
          tenantId: 'tenant-a',
          role: 'TENANT_ADMIN',
        },
      }),
    } as unknown as MembershipContextStore;
    const service = new AuditService(
      firestore as never,
      membershipContext,
    );

    await expect(
      service.record({
        action: 'TENANT_VIEWED',
        entity: 'Tenant',
        entityId: 'tenant-a',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({
      action: 'TENANT_VIEWED',
      entity: 'Tenant',
      entityId: 'tenant-a',
      metadata: { source: 'test' },
      tenantId: 'tenant-a',
      userId: 'user-a',
    });

    expect(recordAudit).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      userId: 'user-a',
      action: 'TENANT_VIEWED',
      entity: 'Tenant',
      entityId: 'tenant-a',
      metadata: { source: 'test' },
    });
  });

  it('records an event without tenant or user context for system events', async () => {
    const recordAudit = jest.fn().mockResolvedValue(undefined);
    const membershipContext = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as MembershipContextStore;
    const service = new AuditService(
      { recordAudit: recordAudit } as never,
      membershipContext,
    );

    await service.record({
      action: 'SYSTEM_EVENT',
      entity: 'Platform',
    });

    expect(recordAudit).toHaveBeenCalledWith({
      tenantId: undefined,
      userId: undefined,
      action: 'SYSTEM_EVENT',
      entity: 'Platform',
      entityId: undefined,
      metadata: undefined,
    });
  });
});
