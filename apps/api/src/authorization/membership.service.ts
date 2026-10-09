import { Injectable } from '@nestjs/common';

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
