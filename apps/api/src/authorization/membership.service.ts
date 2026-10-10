import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import {
  AuthorizationContext,
  MembershipRole,
} from './authorization.types';

export const FINANCIAL_MEMBERSHIP_ROLES = new Set<MembershipRole>([
  'TENANT_FINANCE',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
]);

const MEMBERSHIP_ROLES = new Set<MembershipRole>([
  'TENANT_ADMIN',
  'TENANT_FINANCE',
  'CONTENT_MANAGER',
  'EVENT_MANAGER',
  'INVENTORY_MANAGER',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
]);

@Injectable()
export class MembershipService {
  constructor(private readonly firestore: FirestoreService) {}

  async listTenantMemberships(tenantId: string) {
    return this.firestore.listMemberships(tenantId);
  }

  async assignRolesByEmail(
    email: string,
    tenantId: string,
    roles: string[],
  ) {
    const user = await this.firestore.findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundException('No JCP user exists with that email address');
    }
    return this.assignRoles(user.id, tenantId, roles);
  }

  async assignRoles(
    userId: string,
    tenantId: string,
    requestedRoles: string[],
  ) {
    const roles = [...new Set(requestedRoles)];
    if (
      roles.length === 0 ||
      roles.some((role) => !MEMBERSHIP_ROLES.has(role as MembershipRole))
    ) {
      throw new BadRequestException('At least one supported tenant role is required');
    }

    const user = await this.firestore.getUser(userId);
    if (!user) throw new NotFoundException('User profile not found');

    const existing = await this.firestore.getMembership(userId, tenantId);
    if (existing) {
      if (
        existing.roles.includes('TENANT_ADMIN') &&
        !roles.includes('TENANT_ADMIN')
      ) {
        const tenantMemberships = await this.firestore.listMemberships(tenantId);
        const adminCount = tenantMemberships.filter((membership) =>
          membership.roles.includes('TENANT_ADMIN'),
        ).length;
        if (adminCount <= 1) {
          throw new BadRequestException(
            'At least one temple administrator must remain assigned',
          );
        }
      }
      return this.firestore.updateMembershipRoles(userId, tenantId, roles);
    }

    return this.firestore.createMembership({
      userId,
      tenantId,
      role: roles[0],
      roles,
    });
  }

  async grantFinancialRoleByEmail(
    email: string,
    tenantId: string,
    role: string,
    actorUserId: string,
  ) {
    if (!FINANCIAL_MEMBERSHIP_ROLES.has(role as MembershipRole)) {
      throw new BadRequestException('A supported financial role is required');
    }
    const user = await this.firestore.findUserByEmail(email.trim().toLowerCase());
    if (!user) throw new NotFoundException('No JCP user exists with that email address');
    if (user.id === actorUserId) {
      throw new ForbiddenException(
        'Platform administrators cannot assign financial access to themselves',
      );
    }
    if (user.platformRoles?.includes('PLATFORM_ADMIN')) {
      throw new ForbiddenException(
        'Platform administrators cannot be assigned tenant financial roles',
      );
    }

    const existing = await this.firestore.getMembership(user.id, tenantId);
    const existingRoles = existing?.roles?.length
      ? existing.roles
      : existing
        ? [existing.role]
        : [];
    if (existingRoles.includes('TENANT_ADMIN')) {
      throw new ForbiddenException(
        'Tenant administrators cannot be assigned financial roles',
      );
    }
    return this.assignRoles(user.id, tenantId, [...existingRoles, role]);
  }

  async revokeFinancialRole(userId: string, tenantId: string, role: string) {
    if (!FINANCIAL_MEMBERSHIP_ROLES.has(role as MembershipRole)) {
      throw new BadRequestException('A supported financial role is required');
    }
    const existing = await this.firestore.getMembership(userId, tenantId);
    if (!existing) throw new NotFoundException('Tenant membership not found');
    const currentRoles = existing.roles?.length
      ? existing.roles
      : [existing.role];
    if (!currentRoles.includes(role)) {
      throw new NotFoundException('The requested financial role is not assigned');
    }
    const remainingRoles = currentRoles.filter((currentRole) => currentRole !== role);
    if (remainingRoles.length === 0) {
      await this.firestore.deleteMembership(userId, tenantId);
      return {
        ...existing,
        roles: [],
        membershipDeleted: true,
        previousRoles: currentRoles,
      };
    }
    const membership = await this.assignRoles(userId, tenantId, remainingRoles);
    return { ...membership, membershipDeleted: false, previousRoles: currentRoles };
  }

  async resolve(
    userId: string,
    tenantId: string,
  ): Promise<AuthorizationContext['membership']> {
    const membership = await this.firestore.getMembership(userId, tenantId);

    if (!membership) return null;

    const roles = [
      ...new Set(
        (membership.roles?.length ? membership.roles : [membership.role]).filter(
          (role): role is MembershipRole =>
            MEMBERSHIP_ROLES.has(role as MembershipRole),
        ),
      ),
    ];
    if (roles.length === 0) return null;

    const role = roles.includes(membership.role as MembershipRole)
      ? membership.role as MembershipRole
      : roles[0];

    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role,
      roles,
    };
  }
}
