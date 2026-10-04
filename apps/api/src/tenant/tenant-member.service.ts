import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { FirestoreService } from '../database/firestore.service';
import { TenantContextStore } from './tenant-context.store';
import { MembershipRole } from '../authorization/authorization.types';

export interface TenantMemberSummary {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  role: MembershipRole;
  createdAt: Date;
}

@Injectable()
export class TenantMemberService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly tenantContext: TenantContextStore,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<TenantMemberSummary[]> {
    const tenantId = this.requireTenantId();
    const memberships = await this.firestore.listMemberships(tenantId);
    return memberships.map((membership) => this.toSummary(membership));
  }

  async get(userId: string): Promise<TenantMemberSummary> {
    return this.toSummary(await this.findMembershipWithUser(userId));
  }

  async create(
    userId: string,
    role: MembershipRole,
  ): Promise<TenantMemberSummary> {
    const tenantId = this.requireTenantId();
    const user = await this.firestore.getUser(userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.firestore.getMembership(userId, tenantId);
    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    const membership = await this.firestore.createMembership({
      userId,
      tenantId,
      role,
    });

    await this.audit.record({
      action: 'MEMBERSHIP_CREATED',
      entity: 'Membership',
      entityId: membership.id,
      metadata: { targetUserId: userId, role },
    });

    return this.toSummary({
      ...membership,
      user: { email: user.email ?? null, displayName: user.displayName ?? null },
    });
  }

  async update(
    userId: string,
    role: MembershipRole,
  ): Promise<TenantMemberSummary> {
    const membership = await this.findMembership(userId);

    const updated = await this.firestore.updateMembership(
      userId,
      membership.tenantId,
      role,
    );

    await this.audit.record({
      action: 'MEMBERSHIP_ROLE_CHANGED',
      entity: 'Membership',
      entityId: updated.id,
      metadata: { targetUserId: userId, previousRole: membership.role, role },
    });

    return this.toSummary(await this.findMembershipWithUser(userId));
  }

  async remove(userId: string): Promise<void> {
    const membership = await this.findMembership(userId);
    await this.firestore.deleteMembership(userId, membership.tenantId);

    await this.audit.record({
      action: 'MEMBERSHIP_REMOVED',
      entity: 'Membership',
      entityId: membership.id,
      metadata: { targetUserId: userId, role: membership.role },
    });
  }

  private async findMembershipWithUser(userId: string) {
    const membership = await this.findMembership(userId);
    const user = await this.firestore.getUser(userId);

    return {
      ...membership,
      user: { email: user?.email ?? null, displayName: user?.displayName ?? null },
    };
  }

  private async findMembership(userId: string) {
    const tenantId = this.requireTenantId();
    const membership = await this.firestore.getMembership(userId, tenantId);

    if (!membership) throw new NotFoundException('Tenant membership not found');
    return membership;
  }

  private requireTenantId(): string {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new NotFoundException('Tenant context not found');
    return tenant.id;
  }

  private toSummary(membership: {
    id: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: { email: string | null; displayName: string | null };
  }): TenantMemberSummary {
    return {
      id: membership.id,
      userId: membership.userId,
      email: membership.user?.email ?? undefined,
      displayName: membership.user?.displayName ?? undefined,
      role: membership.role as MembershipRole,
      createdAt: membership.createdAt,
    };
  }
}
