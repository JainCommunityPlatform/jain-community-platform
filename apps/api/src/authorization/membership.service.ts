import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    userId: string,
    tenantId: string,
  ): Promise<AuthorizationContext['membership']> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (
      !membership ||
      !MEMBERSHIP_ROLES.has(membership.role as MembershipRole)
    ) {
      return null;
    }

    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as MembershipRole,
    };
  }
}
