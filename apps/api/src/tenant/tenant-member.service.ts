import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextStore,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<TenantMemberSummary[]> {
    const tenantId = this.requireTenantId();
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => this.toSummary(membership));
  }

  async get(userId: string): Promise<TenantMemberSummary> {
    const membership = await this.findMembership(userId);
    return this.toSummary(membership);
  }

  async create(userId: string, role: MembershipRole): Promise<TenantMemberSummary> {
    const tenantId = this.requireTenantId();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (existing) throw new ConflictException('User is already a member of this tenant');

    const membership = await this.prisma.membership.create({
      data: { userId, tenantId, role },
      include: { user: true },
    });

    await this.audit.record({
      action: 'MEMBERSHIP_CREATED',
      entity: 'Membership',
      entityId: membership.id,
      metadata: { targetUserId: userId, role },
    });

    return this.toSummary(membership);
  }

  async update(userId: string, role: MembershipRole): Promise<TenantMemberSummary> {
    const membership = await this.findMembership(userId);

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role },
      include: { user: true },
    });

    await this.audit.record({
      action: 'MEMBERSHIP_ROLE_CHANGED',
      entity: 'Membership',
      entityId: updated.id,
      metadata: { targetUserId: userId, previousRole: membership.role, role },
    });

    return this.toSummary(updated);
  }

  async remove(userId: string): Promise<void> {
    const membership = await this.findMembership(userId);

    await this.prisma.membership.delete({ where: { id: membership.id } });

    await this.audit.record({
      action: 'MEMBERSHIP_REMOVED',
      entity: 'Membership',
      entityId: membership.id,
      metadata: { targetUserId: userId, role: membership.role },
    });
  }

  private async findMembership(userId: string) {
    const tenantId = this.requireTenantId();
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { user: true },
    });

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
    user: { email: string | null; displayName: string | null };
  }): TenantMemberSummary {
    return {
      id: membership.id,
      userId: membership.userId,
      email: membership.user.email ?? undefined,
      displayName: membership.user.displayName ?? undefined,
      role: membership.role as MembershipRole,
      createdAt: membership.createdAt,
    };
  }
}
