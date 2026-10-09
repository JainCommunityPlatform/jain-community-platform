import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import {
  AuthorizationContext,
  MembershipRole,
} from './authorization.types';

const MEMBERSHIP_ROLES = new Set<MembershipRole>([
  'TENANT_ADMIN',
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
    if (roles.length === 0 || roles.some((role) => !MEMBERSHIP_ROLES.has(role as MembershipRole))) {
      throw new BadRequestException('At least one supported tenant role is required');
    }

    const user = await this.firestore.getUser(userId);
    if (!user) throw new NotFoundException('User profile not found');

    const existing = await this.firestore.getMembership(userId, tenantId);
    if (existing) {
      return this.firestore.updateMembershipRoles(userId, tenantId, roles);
    }

    return this.firestore.createMembership({
      userId,
      tenantId,
      role: roles[0],
      roles,
    });
  }

  async resolve(
    userId: string,
    tenantId: string,
  ): Promise<AuthorizationContext['membership']> {
    const membership = await this.firestore.getMembership(userId, tenantId);

    if (!membership) return null;

    const roles = [...new Set(
      (membership.roles?.length ? membership.roles : [membership.role])
        .filter((role): role is MembershipRole =>
          MEMBERSHIP_ROLES.has(role as MembershipRole),
        ),
    )];
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
