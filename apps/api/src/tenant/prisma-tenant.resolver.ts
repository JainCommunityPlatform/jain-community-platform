import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { TenantContext, TenantResolver } from './tenant.types';

@Injectable()
export class PrismaTenantResolver implements TenantResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(hostname: string): Promise<TenantContext | null> {
    const normalized = normalizeHostname(hostname);
    if (!normalized) return null;

    const domain = await this.prisma.tenantDomain.findUnique({
      where: { hostname: normalized },
      include: { tenant: true },
    });

    if (!domain) return null;

    return {
      id: domain.tenant.id,
      name: domain.tenant.name,
      hostname: domain.hostname,
    };
  }
}

function normalizeHostname(hostname: string | undefined): string | null {
  if (!hostname) return null;

  const normalized = hostname.trim().toLowerCase().replace(/^www\./, '');
  return normalized || null;
}
